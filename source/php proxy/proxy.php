<?php

error_reporting(E_ALL & ~E_USER_NOTICE);

require_once(dirname(__FILE__) . "/lib/steam-condenser.php");
require_once(dirname(__FILE__) . "/config.php");

handle_request($_GET);

if(!function_exists('bin2hex'))
{
  function bin2hex($str)
  {
    $hex = "";

    $i = 0;

    do {
      $hex .= sprintf("%02x", ord($str{$i}));
      $i++;
    } while($i < strlen($str));

    return $hex;
  }
}

if(!function_exists('hex2bin'))
{
  function hex2bin($h)
  {
    if(!is_string($h)) return null;

    $r='';

    for($a = 0; $a < strlen($h); $a += 2)
    {
      $r .= chr(hexdec($h{$a}.$h{($a + 1)}));
    }

    return $r;
  }
}

function write_to_file($path, $content)
{
  $file;

  if(FALSE === ($file = fopen($path, "w"))) die("failed to open file for writing");

  if(FALSE === (fwrite($file, $content))) die("failed to write to file");

  if(FALSE === fclose($file)) die("failed to close file after writing");

  return TRUE;
}

function read_from_file($path, &$content)
{
  $file;

  if(FALSE === ($file = fopen($path, "r"))) die("failed to open file for reading");

  if(FALSE === ($content = fread($file, filesize($path)))) die("failed to read private key from file");

  if(FALSE === fclose($file)) die("failed to close file after reading");

  return TRUE;
}

function delete_file($path)
{
  if(TRUE === file_exists($path))
  {
    if(FALSE === unlink($path)) die("failed to remove file");
  }

  return TRUE;
}

function key_generate()
{
  global $path_public;
  global $path_private;

  if(FALSE === delete_file($path_public)) die("failed to delete public key file");

  if(FALSE === delete_file($path_private)) die("failed to delete private key file");

  $private; $public; $resource;

  if(FALSE === ($resource = openssl_pkey_new(array("private_key_bits" => 1024                   ,
                                                   "private_key_type" => OPENSSL_KEYTYPE_RSA ))))
  {
    die("failed to generate new key");
  }

  if(FALSE == openssl_pkey_export($resource, $private)) die("failed to export key");

  $array = openssl_pkey_get_details($resource);

  $public = $array["key"];

  if(FALSE === write_to_file($path_public, $public)) die("failed to save public key to file");

  if(FALSE === write_to_file($path_private, $private)) die("failed to save private key to file");

  return TRUE;
}

function private_key_get()
{
  global $path_private;

  $private; $error = "failed to get private key - ";

  if(FALSE === file_exists($path_private))
  {
    if(FALSE === key_generate()) die($error . "failed to generate keys");
  }

  if(FALSE === read_from_file($path_private, $private)) die($error . "failed to read key from file");

  return $private;
}

function public_key_get()
{
  global $path_public;

  $public; $modulus; $error = "failed to get public key - ";

  if(FALSE === file_exists($path_public))
  {
    if(FALSE === key_generate()) die($error . "failed to generate keys");
  }

  if(FALSE === read_from_file($path_public, $public)) die($error . "failed to read key from file");

  // apparently the ["rsa"] array isn't available everywhere
  // $modulus = bin2hex($array["rsa"]["n"]); <- won't work all the time
  // a retarded hard-coded method goes as follows:

  $modulus = bin2hex(base64_decode(substr($public, 65, 175)));
  $modulus = substr($modulus, 1, strlen($modulus) - 2);

  return $modulus;
}

function database_connect(&$link)
{
  global $db_address;
  global $db_name;
  global $db_login;
  global $db_password;

  if(FALSE === ($link = mysql_connect($db_address, $db_login, $db_password)))
  {
    return FALSE;
  }

  if(FALSE === mysql_select_db($db_name, $link))
  {
    return FALSE;
  }

  return TRUE;
}

function database_disconnect(&$link)
{
  if(FALSE === mysql_close($link))
  {
    return FALSE;
  }
}

function database_error(&$link, $prefix)
{
  $string = $prefix . " {";

  if(NULL != $link) $string .= mysql_errno($link) . ": " . mysql_error($link);
  if(NULL == $link) $string .= mysql_errno() . ": " . mysql_error();

  $string .= ")";

  return $string;
}

function database_select($key, $variables, &$array)
{
  global $db_table;

  $link; $result; $row = array(); $size = count($variables);

  if(0 == $size) return FALSE;

  if(FALSE === database_connect($link)) die(database_error($link, "failed to connect"));

  $query  = "SELECT ";

  for($i = 0; $i < $size; $i++)
  {
    $query .= $variables[$i] . " ";

    if($i + 1 < $size) $query .= " , ";
  }

  $query .= "FROM " . $db_table . " ";
  $query .= "WHERE client_ip = '" . $_SERVER["REMOTE_ADDR"] . "' AND client_key = '" . $key . "'";

  if(FALSE === ($result = mysql_query($query, $link))) die(database_error($link, "failed to select"));

  reset($array); // just in case

  while(FALSE != ($row = mysql_fetch_array($result, MYSQL_ASSOC)))
  {
    array_push($array, $row);
  }

  if(1 != count($row)) die("multiple records found for key ($key)");

  if(FALSE === database_disconnect($link)) die(database_error($link, "failed to disconnect"));

  return TRUE;
}

function variable_get($array, $element)
{
  if(true == isset($array[$element]))
  {
    return htmlentities($array[$element], ENT_QUOTES, "UTF-8");
  }

  return NULL;
}

function server_request($key, $command)
{
  $ip; $port; $user; $pass; $error = "failed to perform server request ($command) - ";

  if(defined("MNC_PROXY_USE_SESSION") && TRUE === MNC_PROXY_USE_SESSION)
  {
    $ip   = $_SESSION[$key . "_client_server_ip"];
    $port = $_SESSION[$key . "_client_web_port"];

    $user = $_SESSION[$key . "_client_username"];
    $pass = $_SESSION[$key . "_client_password"];
  }
  else
  {
    $private; $row = array();

    if(TRUE != database_select($key, array("client_server_ip", "client_web_port", "client_username", "client_password"), $row)) die($error . "failed to query");

    if(FALSE === ($private = private_key_get())) die($error . "failed to retrieve private key");

    $ip = $row[0]["client_server_ip"];

    if(TRUE != openssl_private_decrypt(base64_decode($row[0]["client_web_port"]) , $port , $private)) die($error . "invalid web port");
    if(TRUE != openssl_private_decrypt(base64_decode($row[0]["client_username"]) , $user , $private)) die($error . "invalid username");
    if(TRUE != openssl_private_decrypt(base64_decode($row[0]["client_password"]) , $pass , $private)) die($error . "invalid password");
  }

  $ch = curl_init();

  $url = "http://" . $ip . ":" . $port . "/" . $command;

  curl_setopt($ch, CURLOPT_URL            , $url);
  curl_setopt($ch, CURLOPT_HTTPAUTH       , CURLAUTH_DIGEST);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER , true);
  curl_setopt($ch, CURLOPT_USERPWD        , $user . ":" . $pass);

  $result = curl_exec($ch);

  curl_close($ch);

  return $result;
}

function quoted_string_trim($item)
{
  $pos  = strpos($item, "\"")  + 1;
  $size = strrpos($item, "\"") - $pos;

  return substr($item, $pos, $size);
}

function player_list($key, $request, $callback)
{
  $result; $list; $error = "failed to retrieve player list - ";

  if(FALSE === ($list = server_request($key, "playerlist"))) die($error . "server request failed");

  $user = explode("{", $list);
  $size = count($user);

  $result = $callback . "({\"PlayerList\":[";

  if($size > 2)
  {
    for($i = 2; $i < $size; $i++)
    {
      $array = explode(",", $user[$i]);

      $name = quoted_string_trim(strstr($array[0], ": "));
      $id   = quoted_string_trim(strstr($array[1], ": "));

      $name = htmlentities($name, ENT_QUOTES);

      $result .= "{\"Name\": \"" . $name . "\", \"Id\": \"" . $id . "\"}";

      if($i + 1 < $size) $result .= ", ";
    }
  }

  $result .= "]});";

  return $result;
}

function chat_line_push(&$lines, $new)
{
  $old = false;

  if(false === is_array($lines)) return;
  if(false === is_array($new))   return;

  foreach($lines as $line)
  {
    $counter = 0;

    foreach($line as $value)
    {
      if(true === in_array($value, $new, true))
      {
        $counter++;
      }
    }

    if($counter === count($line))
    {
      $old = true;

      break;
    }
  }

  if(false === $old)
  {
    array_push($lines, $new);
  }
}

function chat_history($key, $request, $callback)
{
  $time; $log; $result; $error = "failed to retrieve chat history - ";

  if(NULL == ($time = variable_get($request, "time"))) die($error . "no time specified");

  if(FALSE === ($log = server_request($key, "chathistory?time=" . $time))) die($error . "server request failed");

  $lines = array();

  $line = explode("{", $log);
  $size = count($line);

  if($size > 2)
  {
    for($i = 2; $i < $size; $i++)
    {
      $postfix = $i + 1 === $size ? 3 : 2;

      /* splitting on newline is not really the way to go
       * but the JSON from the dedicated server is barfed
       * and won't be fixed soon anyway, so what the hell
       */

      $array = explode("\n", $line[$i]);

      $num = (count($array) - $postfix) / 4;

      for($j = 0; $j < $num; $j++)
      {
        $base = $j * 4;

        $name  = quoted_string_trim(strstr($array[$base + 0], ": "));
        $team  = quoted_string_trim(strstr($array[$base + 1], ": "));
        $text  = quoted_string_trim(strstr($array[$base + 2], ": "));

        $stamp = strstr($array[$base + 3], ": ");
        $stamp = substr($stamp, 2, strlen($stamp) - 4);

        // godawful hack but that one backslash seems to garble the JSONP parsing

        if("[ADMIN\]" === $name) $name = "[ADMIN]";

        $text = preg_replace("/\\\\/", "", $text);
        $text = htmlentities($text, ENT_QUOTES);

        chat_line_push($lines, array("name" => $name, "team" => $team, "text" => $text, "time" => $stamp));
      }
    }
  }

  $size = count($lines);

  $result = $callback . "({\"ChatHistory\":[";

  for($i = 0; $i < $size; $i++)
  {
    $result .= "{";

    $result .= "\"UserName\": \"" . $lines[$i]["name"] . "\", ";
    $result .= "\"bTeamSay\": \"" . $lines[$i]["team"] . "\", ";
    $result .= "\"Text\": \""     . $lines[$i]["text"] . "\", ";
    $result .= "\"TimeStamp\": "  . $lines[$i]["time"];

    $result .= "}";

    if($i + 1 < $size) $result .= ", ";
  }

  $result .= "]});";

  return $result;
}

function player_details($key, $request, $callback)
{
  $id; $result; $error = "failed to retrieve player details - ";

  if(NULL == ($id = variable_get($request, "id"))) die($error . "no id specified");

  if(FALSE === ($result = server_request($key, "playerdetails?id=" . $id))) die($error . "server request failed");

  // error check - sometimes a player has left the server before the request is made

  $check = substr($result, 0, 5);

  if("Error" === $check) $result = "";

  return $callback . "(" . $result . ")";
}

function send_chat($key, $request, $callback)
{
  $msg; $error = "failed to send chat - ";

  if(FALSE === (server_request($key, "sendchat?msg=" . urlencode($request["msg"])))) die($error . "server request failed");

  return $callback . "();";
}

function kick($key, $request, $callback)
{
  $id; $error = "failed to kick player - ";

  if(NULL == ($id = variable_get($request, "id"))) die($error . "no id specified");

  if(FALSE === (server_request($key, "kick?id=" . $id))) die($error . "server request failed");

  return $callback . "();";
}

function kick_ban($key, $request, $callback)
{
  $id; $error = "failed to kickban player - ";

  if(NULL == ($id = variable_get($request, "id"))) die($error . "no id specified");

  if(FALSE === server_request($key, "kickban?id=" . $id)) die($error . "server request failed");

  return $callback . "();";
}

function server_status($key, $request, $callback)
{
  $error = "failed to retrieve server status - ";

  if(FALSE === ($result = server_request($key, "serverstatus"))) die($error . "server request failed");

  return $callback . "(" . $result . ")";
}

function list_bans($key, $request, $callback)
{
  $error = "failed to retrieve ban list - ";

  if(FALSE === ($result = server_request($key, "listbans"))) die($error . "server request failed");

  return $callback . "(" . $result . ")";
}

function unban($key, $request, $callback)
{
  $id; $error = "failed to unban player - ";

  if(NULL == ($id = variable_get($request, "id"))) die($error . "no id specified");

  if(FALSE === server_request($key, "unban?id=" . $id)) die($error . "server request failed");

  return $callback . "();";
}

function server_map($key, $request, $callback)
{
  $ip; $port; $error = "failed to retrieve server map - ";

  if(defined("MNC_PROXY_USE_SESSION") && TRUE === MNC_PROXY_USE_SESSION)
  {
    $ip   = $_SESSION[$key . "_client_server_ip"];
    $port = $_SESSION[$key . "_client_game_port"];
  }
  else
  {
    $row = array();

    if(TRUE != database_select($key, array("client_server_ip", "client_game_port"), $row)) die($error . "failed to query");

    $ip   = $row[0]["client_server_ip"];
    $port = $row[0]["client_game_port"];
  }

  $server = new SourceServer($ip, $port);

  //$server -> initialize();
  //$server -> updateServerInfo();

  $info = $server -> getServerInfo();

  $map = true == isset($info["mapName"]) ? $info["mapName"] : "Unknown";

  return $callback . "({\"mapName\": \"" . $map . "\"})";
}

function server_info($key, $request, $callback)
{
  $result; $error = "failed to retrieve server info - ";

  if(defined("MNC_PROXY_USE_SESSION") && TRUE === MNC_PROXY_USE_SESSION)
  {
    $ip   = $_SESSION[$key . "_client_server_ip"];
    $port = $_SESSION[$key . "_client_game_port"];
  }
  else
  {
    $row = array();

    if(TRUE != database_select($key, array("client_server_ip", "client_game_port"), $row)) die($error . "failed to query");

    $ip   = $row[0]["client_server_ip"];
    $port = $row[0]["client_game_port"];
  }

  $server = new SourceServer($ip, $port);

  //$server -> initialize();
  //$server -> updateServerInfo();

  $info = $server -> getServerInfo();

  if(false == isset($info["gameDesc"]))         die($error . "failed to retrieve game description");
  if(false == isset($info["mapName"]))          die($error . "failed to retrieve map name");
  if(false == isset($info["numberOfPlayers"]))  die($error . "failed to retrieve number of players");
  if(false == isset($info["serverTags"]))       die($error . "failed to retrieve server tags");

  $array = explode("!", $info["serverTags"]);

  if(28 != count($array)) die($error . "invalid number of server tags");

  if("Crossfire" != $array[0]) die($error . "only crossfire servers are supported");

  $result = $callback . "({\"ServerInfo\":{";

  $result .= "\"ServerName\": \""         . $info["gameDesc"]        . "\",";
  $result .= "\"MapName\": \""            . $info["mapName"]         . "\",";
  $result .= "\"MapIndex\": "             . $array[17]               . ",";
  $result .= "\"NumberOfPlayers\": "      . $info["numberOfPlayers"] . ",";
  $result .= "\"bAllowJuicePurch\": \""   . $array[1]                . "\",";
  $result .= "\"bAllowBotPurch\": \""     . $array[2]                . "\",";
  $result .= "\"bAllowHazards\": \""      . $array[3]                . "\",";
  $result .= "\"bAllowMascot\": \""       . $array[4]                . "\",";
  $result .= "\"bAllowCustomClass\": \""  . $array[5]                . "\",";
  $result .= "\"bAllowChangeClass\": \""  . $array[6]                . "\",";
  $result .= "\"bForceRandomClass\": \""  . $array[7]                . "\",";
  $result .= "\"bAllowTeamSelect\": \""   . $array[8]                . "\",";
  $result .= "\"bAutoBalance\": \""       . $array[9]                . "\",";
  $result .= "\"MinNumToStart\": "        . $array[16]               . ",";
  $result .= "\"MatchDuration\": "        . $array[18]               . ",";
  $result .= "\"OTDuration\": "           . $array[19]               . ",";
  $result .= "\"MaxStarRating\": "        . $array[26]                    ;

  $result .=  "}});";

  return $result;
}

function authorize($request, $callback)
{
  global $db_table;

  $ip; $port; $key; $error = "failed to authorize - ";

  if(NULL == ($ip   = variable_get($request, "ip")))   die($error . "no server address specified");
  if(NULL == ($port = variable_get($request, "port"))) die($error . "no game port specified");
  if(NULL == ($key  = variable_get($request, "key")))  die($error . "no key specified");

  $link; $result; $row = array();

  if(FALSE === database_connect($link)) die(database_error($link, $error . "failed to connect"));

  // check if ip:port already exists with this client ip

  $query  = "SELECT client_key , client_web_port , client_username , client_password ";
  $query .= "FROM " . $db_table . " ";
  $query .= "WHERE client_ip = '" . $_SERVER["REMOTE_ADDR"] . "' AND client_server_ip = '" . $ip . "' AND client_game_port = '" . $port . "'";

  if(FALSE === ($result = mysql_query($query, $link))) die(database_error($link, $error . "failed to select"));

  while(FALSE != ($array = mysql_fetch_array($result, MYSQL_ASSOC)))
  {
    array_push($row, $array);
  }

  // if not then exit here

  if(1 != count($row)) die($error . "multiple rows found for key ($key)");

  if(FALSE === database_disconnect($link)) die(database_error($link, $error . "failed to disconnect"));

  if($row[0]["client_key"] != $key) die($error . "key mismatch");

  // store info in session if session variables are enabled

  if(defined("MNC_PROXY_USE_SESSION") && TRUE === MNC_PROXY_USE_SESSION)
  {
    $private; $web; $user; $pass;

    if(FALSE === ($private = private_key_get())) die($error . "failed to retrieve private key");

    if(TRUE != openssl_private_decrypt(base64_decode($row[0]["client_web_port"]) , $web  , $private)) die($error . "failed to decrypt web port");
    if(TRUE != openssl_private_decrypt(base64_decode($row[0]["client_username"]) , $user , $private)) die($error . "failed to decrypt username");
    if(TRUE != openssl_private_decrypt(base64_decode($row[0]["client_password"]) , $pass , $private)) die($error . "failed to decrypt password");

    $_SESSION[$key . "_client_ip"]        = $_SERVER["REMOTE_ADDR"];
    $_SESSION[$key . "_client_server_ip"] = $ip;
    $_SESSION[$key . "_client_game_port"] = $port;
    $_SESSION[$key . "_client_web_port"]  = $web;
    $_SESSION[$key . "_client_username"]  = $user;
    $_SESSION[$key . "_client_password"]  = $pass;
  }

  return $callback . "({\"Authorization\": \"Success\"});";
}

function register($request, $callback)
{
  global $db_table;

  $ip; $port; $web; $user; $pass; $error = "failed to register - ";

  if(NULL == ($ip   = variable_get($request, "ip")))   die($error . "no server address specified");
  if(NULL == ($port = variable_get($request, "port"))) die($error . "no game port specified");
  if(NULL == ($web  = variable_get($request, "web")))  die($error . "no web port specified");
  if(NULL == ($user = variable_get($request, "user"))) die($error . "no username specified");
  if(NULL == ($pass = variable_get($request, "pass"))) die($error . "no password specified");

  $link; $result; $row = array();

  if(FALSE === database_connect($link)) die(database_error($link, $error . "failed to connect"));

  // check if ip:port already exists with this client ip

  $query  = "SELECT client_id ";
  $query .= "FROM " . $db_table . " ";
  $query .= "WHERE client_ip = '" . $_SERVER["REMOTE_ADDR"] . "' AND client_server_ip = '" . $ip . "' AND client_game_port = '" . $port . "'";

  if(FALSE === ($result = mysql_query($query, $link))) die(database_error($link, $error . "failed to select"));

  while(FALSE != ($array = mysql_fetch_array($result, MYSQL_ASSOC)))
  {
    array_push($row, $array);
  }

  // if not then exit here

  if(1 != count($row)) die($error . "unknown ip:port address");

  // super fancy key generation

  $key = md5($row[0]["client_id"]);

  // store webport , username , password and key in database

  $query  = "UPDATE " . $db_table . " ";
  $query .= "SET client_web_port='" . $web . "' , client_username='" . $user . "' , client_password='" . $pass . "' , client_key='" . $key . "' ";
  $query .= "WHERE client_ip = '" . $_SERVER["REMOTE_ADDR"] . "' AND client_server_ip = '" . $ip . "' AND client_game_port = '" . $port . "'";

  if(FALSE === mysql_query($query, $link)) die(database_error($link, $error . "failed to update"));

  if(FALSE === database_disconnect($link)) die(database_error($link, $error . "failed to disconnect"));

  return $callback . "({\"Key\": \"".$key."\"});";
}

function public_key($request, $callback)
{
  global $db_table;

  $ip; $port; $error = "failed to retrieve public key - ";

  if(NULL == ($ip   = variable_get($request, "ip")))   die($error . "no ip specified");
  if(NULL == ($port = variable_get($request, "port"))) die($error . "no port specified");

  // every request for the public key is logged

  $link; $result; $row = array();

  if(FALSE === database_connect($link)) die(database_error($link, $error . "failed to connect"));

  // check if ip:port already exists with this client ip

  $query  = "SELECT client_id ";
  $query .= "FROM " . $db_table . " ";
  $query .= "WHERE client_ip = '" . $_SERVER["REMOTE_ADDR"] . "' AND client_server_ip = '" . $ip . "' AND client_game_port = '" . $port . "'";

  if(FALSE === ($result = mysql_query($query, $link))) die(database_error($link, $error . "failed to select"));

  while(FALSE != ($array = mysql_fetch_array($result, MYSQL_ASSOC)))
  {
    array_push($row, $array);
  }

  // if a record is not found - they will be entered now

  if(0 == count($row))
  {
    $query  = "INSERT INTO " . $db_table . " ";
    $query .= "(client_ip, client_server_ip, client_game_port)";
    $query .= "VALUES ('" . $_SERVER["REMOTE_ADDR"] . "', '" . $ip . "', '" . $port . "')";

    if(FALSE === mysql_query($query, $link)) die(database_error($link, $error . "failed to insert"));
  }

  if(FALSE === database_disconnect($link)) die(database_error($link, $error . "failed to disconnect"));

  $public;

  if(FALSE === ($public = public_key_get())) die($error . "no key was found");

  return $callback . "({\"PublicKey\": \"" . $public . "\"});";
}

function online($request, $callback)
{
  return $callback . "({\"Online\": \"True\"})";
}

function server_list($request, $callback)
{
  $ip; $result; $error = "failed to retrieve server list - ";

  if(NULL == ($ip = variable_get($request, "ip"))) die($error . "no IP specified");

  $base  = 27015; /* the base port for the MNC dedicated server */
  $range = 16;    /* the port range to be scanned */

  $list = array();

  for($i = 0; $i < $range; $i++)
  {
    $server = new SourceServer($ip, $base + $i);

    $info = $server -> getServerInfo();

    if(false === isset($info["gameDesc"])) continue;

    array_push($list, array("Name" => $info["gameDesc"], "Port" => $base + $i));
  }

  $size = count($list);

  $result = $callback . "({\"ServerList\":[";

  for($i = 0; $i < $size; $i++)
  {
    $name = htmlentities($list[$i]["Name"], ENT_QUOTES);

    $result .= "{\"Name\": \"" . $name . "\", \"Port\": " . $list[$i]["Port"] . "}";

    if($i + 1 < $size) $result .= ", ";
  }

  $result .= "]});";

  return $result;
}

function handle_request($array)
{
  if(defined("MNC_PROXY_USE_SESSION") && TRUE === MNC_PROXY_USE_SESSION)
  {
    @session_start();
  }

  header('Content-type: text/javascript');
  header("Cache-Control: no-cache, must-revalidate");

  $request; $callback; $result; $error = "failed to process request - ";

  if(NULL == ($request  = variable_get($array, "request")))  die($error . "no request specified");
  if(NULL == ($callback = variable_get($array, "callback"))) die($error . "no callback specified for request ($request)");

  $list = array("playerlist"    , "player_list"    , true   ,
                "playerdetails" , "player_details" , true   ,
                "chathistory"   , "chat_history"   , true   ,
                "sendchat"      , "send_chat"      , true   ,
                "kick"          , "kick"           , true   ,
                "kickban"       , "kick_ban"       , true   ,
                "serverstatus"  , "server_status"  , true   ,
                "listbans"      , "list_bans"      , true   ,
                "unban"         , "unban"          , true   ,
                "serverinfo"    , "server_info"    , true   ,
                "servermap"     , "server_map"     , true   ,
                "serverlist"    , "server_list"    , false  ,
                "publickey"     , "public_key"     , false  ,
                "online"        , "online"         , false  ,
                "authorize"     , "authorize"      , false  ,
                "register"      , "register"       , false );

  $size = count($list);

  for($i = 0; $i < $size; $i += 3)
  {
    if($list[$i] === $request)
    {
      if(true === $list[$i + 2])
      {
        $key;

        if(NULL == ($key = variable_get($array, "key"))) die($error . "no key specified for request ($request)");

        $result = call_user_func($list[$i + 1], $key, $array, $callback);
      }
      else
      {
        $result = call_user_func($list[$i + 1], $array, $callback);
      }
    }
  }

  if(defined("MNC_PROXY_USE_SESSION") && TRUE === MNC_PROXY_USE_SESSION)
  {
    @session_write_close();
  }

  echo $result;
}

?>
