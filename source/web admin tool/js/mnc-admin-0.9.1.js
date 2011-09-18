var DEBUG_FLAG_NONE              = 1 << 0;
var DEBUG_FLAG_LOGGING_ENABLED   = 1 << 1;
var DEBUG_FLAG_REQUEST_HIGHLIGHT = 1 << 2;

var DEBUG_FLAG_DEFAULT = DEBUG_FLAG_LOGGING_ENABLED   |
                         DEBUG_FLAG_REQUEST_HIGHLIGHT ;

var debugMode = DEBUG_FLAG_NONE;

var serverKey   = "" ;
var serverIP    = "" ;
var serverPort  = -1 ;
var serverName  = "" ;

function debugLog(text)
{
  if(DEBUG_FLAG_LOGGING_ENABLED == (DEBUG_FLAG_LOGGING_ENABLED & debugMode))
  {
    if(console)
    {
      var d = new Date();

      var hr = numberPad(d.getHours()   , 1);
      var mn = numberPad(d.getMinutes() , 1);
      var sc = numberPad(d.getSeconds() , 1);

      console.log("[" + hr + ":" + mn + ":" + sc + "]" + " " + text);
    }
  }
}

function errorLog(text)
{
  debugLog("ERROR: " + text);
}

function objectPrint(object, prefix)
{
  pfx = undefined != prefix ? prefix + "." : "";

  for(var i in object)
  {
    if(object.hasOwnProperty(i))
    {
      var item = object[i];

      debugLog(pfx + i + ": " + item);

      if("object" == typeof(item))
      {
        objectPrint(item, pfx + i);
      }
    }
  }
}

function ServerCommand(apiCmd, successHandler, errorHandler, completeHandler, time)
{
  var cmdStr = proxyURL + "?key=" + serverKey + "&" + apiCmd;

  debugLog("request: " + cmdStr);

  timeout = undefined == time ? 3000 : time ;

  var req = $.ajax({url         : cmdStr          ,
                    crossDomain : true            ,
                    dataType    : "jsonp"         ,
                    timeout     : timeout         ,
                    success     : successHandler  ,
                    error       : errorHandler    ,
                    complete    : completeHandler });
}

function clientStart()
{
  serverStatusRequest();
  serverMapRequest();
  serverInfoRequest();
  playerListRequest();
  playerDetailsRequest();
  chatLogRequest();
  banListRequest();
}

function numberPad(number, amount)
{
  var result = "";

  switch(amount)
  {
    case 2 : result += number < 100 ? "0" : "";

             /* fall through */

    case 1 : result += number < 10 ? "0" : "";

             break;
  }

  result += number;

  return result;
}

function numberRound(n, dec)
{
	n = parseFloat(n);

	if(!isNaN(n))
  {
		if(!dec) var dec = 0;

		var factor = Math.pow(10, dec);

		return Math.floor(n * factor + ((n * factor * 10) % 10 >= 5 ? 1 : 0)) / factor;
	}
  else
  {
		return n;
	}
}

function moneyPrint(value)
{
  var millions  = 0;
  var thousands = 0;
  var remainder = 0;

  thousands = Math.floor(value / 1000);
  remainder = value - (thousands * 1000);

  if(thousands >= 1000)
  {
    millions  = Math.floor(thousands / 1000);
    thousands = thousands % 1000;
  }

  if(millions > 0)
  {
    return "$" + millions + "," + numberPad(thousands, 2) + "," + numberPad(remainder, 2);
  }

  if(thousands > 0)
  {
    return "$" + thousands + "," + numberPad(remainder, 2);
  }

  return "$" + remainder;
}

function timePrint(time)
{
  var minutes = Math.floor(time / 60);
  var seconds = numberPad(time % 60 , 1);

  return minutes + " Min " + seconds + " Sec";
}

function booleanPrint(value)
{
  if(true  == value) return "<span style=\"color:#00CC00;\">True</span>";
  if(false == value) return "<span style=\"color:#db0000;\">False</span>";

  return "<span style=\"color:#336699;\">Unknown</span>";
}

function pingPrint(value)
{
  var result = "<span style=\"color:";

  if(value > 200)
  {
    result += "#db0000";
  }
  else if(value < 100)
  {
    result += "#00CC00";
  }
  else
  {
    result += "#FFFFFF";
  }

  result += "\">" + value + "</span>";

  return result;
}

function nop()
{
  return "-";
}

function buttonMake(element, func)
{
  $(element).addClass("button");
  $(element).mouseenter(function(){$(this).css("color", "#FFFF00");});
  $(element).mouseleave(function(){$(this).css("color", "#FFFFFF");});
  $(element).click(function(){func()});
}

var banListTable   = "#banlisttable";
var banListRows    = 9;
var banListTimer   = 0;
var banListActive  = false;
var banListVisible = false;

function unBanPlayer(id)
{
  if(true == confirm("Are you sure you wish to unban this player?"))
  {
    unBan(id);
  }
}

function banListRow(id)
{
  var pid = -1 == id ? nop() : id;
  var bid = -1 == id ? nop() : "unban" + id;
  var txt = -1 == id ? nop() : "Unban";

  var msg = "<tr><td width=\"210\" style=\"padding-left: 14px;\">" + pid + "</td><td width=\"70\" id=\"" + bid + "\">" + txt + "</td></tr>";

  $(banListTable + " > tbody:last").append(msg);

  if(-1 != id)
  {
    buttonMake("#" + bid, function(){unBanPlayer(id);});

    $("#" + bid).mouseenter(function(){$(this).addClass('bltrhilite');});
    $("#" + bid).mouseleave(function(){$(this).removeClass('bltrhilite');});
  }
}

function banListEmpty()
{
  $(banListTable).empty();
  $(banListTable).append("<tbody></tbody>");
}

function banListFill()
{
  if(0 == $(banListTable + " tbody").length)
  {
    $(banListTable).append("<tbody></tbody>");
  }

  while($(banListTable + " tr").length < banListRows)
  {
    banListRow(-1);
  }

  $(banListTable + " tr:odd").addClass("bltralt");

  if(1)
  {
    var msg = "<tr><td colspan=\"2\" id=\"closebanlist\" style=\"text-align: center; background-color:#990066\">Close Ban List</td></tr>";

    $(banListTable + " > tbody:last").append(msg);

    buttonMake("#closebanlist", function(){banListToggle();});
  }
}

function banListToggle()
{
  if(false == banListVisible)
  {
    $(".banlistdiv").css("visibility", "visible");
    false == banListSafe() ? $("#banlistempty").css("visibility", "visible") : $("#banlistempty").css("visibility", "hidden");
    banListVisible = true;
  }
  else
  {
    $(".banlistdiv").css("visibility", "hidden");
    $("#banlistempty").css("visibility", "hidden");
    banListVisible = false;
  }
}

function banListUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.ListBans) return;

  banListEmpty();

  for(var i = 0; i < data.ListBans.length; i++)
  {
    banListRow(data.ListBans[i]);
  }

  banListFill();

  $("#banlistempty").css("visibility", "hidden");
}

function banListSafe()
{
  var result = false;

  if(false == banListVisible)
  {
    return result;
  }

  switch(Server.status)
  {
    case SERVER_STATUS.MATCH_ACTIVE   : result = true;

                                        break;

    case SERVER_STATUS.MATCH_END      :
    case SERVER_STATUS.HOSTILE_LOBBY  :
    case SERVER_STATUS.MATCH_START    :
    case SERVER_STATUS.TRANSITION     :
    case SERVER_STATUS.UNKNOWN        : result = false;

                                        break;
  }

  return result;
}

function banListSuccess(data, textStatus, jqXHR)
{
  banListUpdate(data);
}

function banListError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  banListActive = false;
}

function banListComplete(jqXHR, textStatus)
{
  if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
  {
    $("#banlisttitle").css("color", "#ffffff");
  }

  banListActive = false;
}

function banListRequest()
{
  if(false == banListActive)
  {
    if(true == banListSafe())
    {
      ServerCommand("request=listbans"      ,
                    banListSuccess  ,
                    banListError    ,
                    banListComplete );

      banListActive = true;

      if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
      {
        $("#banlisttitle").css("color", "#00CC00");
      }
    }
  }

  banListTimer = setTimeout(function(event){banListRequest();}, defaultTimeOut);
}

function unBanSuccess(data, textStatus, jqXHR)
{
  //
}

function unBanError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");
}

function unBanComplete(jqXHR, textStatus)
{
  //
}

function unBan(id)
{
  if(true == banListSafe())
  {
    ServerCommand("request=unban&id="+id ,
                  unBanSuccess   ,
                  unBanError     ,
                  unBanComplete  );
  }
}


var chatHistory    = [];
var chatLogTimer   = 0;
var chatLogActive  = false;

function chatLogSort(a, b)
{
  return a.time - b.time;
}

function chatLineNew(text, time, name)
{
  for(var i = 0; i < chatHistory.length; i++)
  {
    if(time == chatHistory[i].time)
    {
      if(name == chatHistory[i].name)
      {
        if(text == chatHistory[i].text)
        {
          return false;
        }
      }
    }
  }

  return true;
}

function chatLineUserFind(name)
{
  for(var i = 0; i < playerList.length; i++)
  {
    if(name === playerList[i].escapedName)
    {
      return i;
    }
  }

  return -1;
}

function chatLineStyleGet(index, team)
{
  var result = "chatlineglobal";

  if("True" == team)
  {
    if(-1 == index) return result; /* just in case */

    switch(playerList[index].team)
    {
      case 0  : result = "chatlinehotshots";

                break;

      case 1  : result = "chatlineicemen";

                break;

      default : /* do nothing */

                break;
    }
  }

  return result;
}

function chatLogUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.ChatHistory) return;

  // fill temp array with chat log

  var tempChat = [];

  for(var i = 0; i < data.ChatHistory.length; i++)
  {
    var msg       = data.ChatHistory[i].Text;
    var userName  = data.ChatHistory[i].UserName;
    var timeStamp = data.ChatHistory[i].TimeStamp;
    var teamSay   = data.ChatHistory[i].bTeamSay;

    tempChat.push({time:timeStamp, name:userName, text:msg, team:teamSay});
  }

  var update = false;

  // check if there are new entries in the chatlog

  while(0 != tempChat.length)
  {
    var line = tempChat.shift();

    if(true == chatLineNew(line.text, line.time, line.name))
    {
      update = true;

      var index = chatLineUserFind(line.name);

      var name = -1 != index ? playerList[index].name : line.name;

      if(-1 == index && "[ADMIN]" != name) continue;

      var temp = chatLineStyleGet(index, line.team);

      chatHistory.push({time:line.time, name:line.name, text:line.text, style:temp, user:name});
    }
  }

  if(true == update)
  {
    chatHistory.sort(chatLogSort);

    chatLog();
  }
}

function chatLog()
{
  $("#chatlogtextarea > .chatloginner").remove(".chatline");

  var msg = "";

  for(var i = 0; i < chatHistory.length; i++)
  {
    var line = chatHistory[i];

    msg += "<div class=\"chatline\">";
    if("[ADMIN]" != line.user) msg += "<div class=\"chatlinename\">" + line.user + ":&nbsp;</div>";
    msg += "<div class=\"chatline\"><div class=\"" + line.style + "\">" + line.text + "</div>";
    msg += "</div>";
  }

  $("#chatlogtextarea > .chatloginner").html(msg);
  $("#chatlogtextarea").animate({scrollTop: $("#chatlogtextarea > .chatloginner").outerHeight()});
}

function chatLogSafe()
{
  var result = false;

  switch(Server.status)
  {
    case SERVER_STATUS.MATCH_START    :
    case SERVER_STATUS.MATCH_ACTIVE   :
    case SERVER_STATUS.MATCH_END      : result = true;

                                        break;

    case SERVER_STATUS.HOSTILE_LOBBY  :
    case SERVER_STATUS.TRANSITION     :
    case SERVER_STATUS.UNKNOWN        : result = false;

                                        break;
  }

  return result;
}

function chatLogSuccess(data, textStatus, jqXHR)
{
  chatLogUpdate(data);
}

function chatLogError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  chatLogActive = false;
}

function chatLogComplete(jqXHR, textStatus)
{
  if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
  {
    $("#chatlogtitle").css("color", "#ffffff");
  }

  chatLogActive = false;
}

function chatLogRequest()
{
  if(true == chatLogSafe())
  {
    if(false == chatLogActive)
    {
      ServerCommand("request=chathistory&time=0" ,
                    chatLogSuccess       ,
                    chatLogError         ,
                    chatLogComplete      );

      chatLogActive = true;

      if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
      {
        $("#chatlogtitle").css("color", "#00CC00");
      }
    }
  }

  chatLogTimer = setTimeout(function(event){chatLogRequest();}, defaultTimeOut);
}

function chatSendSuccess(data, textStatus, jqXHR)
{
  // clear the chat input on successful chat send

  $("#chatinput").val("");
}

function chatSendError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");
}

function chatSendComplete(jqXHR, textStatus)
{
  //
}

function chatSend(text)
{
  if(true == chatLogSafe())
  {
    msg = encodeURIComponent(text); // is escape() better in this case?

    ServerCommand("request=sendchat&msg=" + msg ,
                  chatSendSuccess        ,
                  chatSendError          ,
                  chatSendComplete       );
  }
}


configVisible = false;
configTable   = "#configtable";
configLoading = "#loading";
configText    = "#configtext";
configRows    = 4;

function configMsg(text)
{
  var msg = text;

  var tmp = $(configText).val();

  if(tmp.length > 0)
  {
    msg = tmp + "\n" + msg;
  }

  $(configText).val(msg);
  $(configText).scrollTop(5000); /* such a bad hack to make the <textarea> scroll down */
}

function configEmpty()
{
  $(configTable).empty();
  $(configTable).append("<tbody></tbody>");
}

function configRow(name, port)
{
  name = undefined != name ? name : "&nbsp;";
  port = undefined != port ? port : -1;

  var msg = "<tr><td id=\"" + port + "\">" + name + "</td></tr>";

  $(configTable + " > tbody:last").append(msg);

  if(-1 != port)
  {
    $("#" + port).css("cursor", "pointer");
    $("#" + port).mouseenter(function(){$(this).addClass('ctrhilite');});
    $("#" + port).mouseleave(function(){$(this).removeClass('ctrhilite');});
    $("#" + port).click(function(){configServerClick(port);});
  }
}

function configFill()
{
  if(0 == $(configTable + " tbody").length)
  {
    $(configTable).append("<tbody></tbody>");
  }

  while($(configTable + " tr").length < configRows)
  {
    configRow();
  }
}

function configCookiecheck()
{
  $.cookie("mnc_test_cookie", "foo");

  if("foo" != $.cookie("mnc_test_cookie"))
  {
    configMsg("Support for local cookies is not enabled.");
    configMsg("Consult the readme.txt for more information.");
  }
}

function configToggle()
{
  if(false == configVisible)
  {
    $(".disable").css("visibility", "visible");
    $(".configdiv").css("visibility", "visible");

    configVisible = true;

    configStart();
  }
  else
  {
    $(".configdiv").css("visibility", "hidden");
    $("#configweb").css("visibility", "hidden");
    $(".disable").css("visibility", "hidden");

    configVisible = false;
  }
}

function configStart()
{
  configEmpty();
  configFill();

  $(configText).val("");

  configCookiecheck();

  configMsg("Checking proxy status...");

  $(configLoading).css("visibility", "visible");

  proxyOnlineRequest(function(){configProxyOnline();}, function(){configProxyOffline();});
}

function configServerDefault()
{
  var server = $.cookie("mnc_server_last");

  $("#serverinput").val(server);

  configMsg("Using server address of previous session.");

  var found = 0;

  var base = 27015; var range = 16;

  for(var i = 0; i < range; i++)
  {
    var name = "mnc_" + server.replace(/\./g, "_") + "_" + (base + i);

    if(null != $.cookie(name))
    {
      serverList.push({name:$.cookie(name), port:(base + i)});

      found++;
    }
  }

  if(found > 0)
  {
    configMsg("Using server list of previous session.");

    configServerListDone();
  }
}

function configProxyOnline()
{
  configMsg("Proxy at " + proxyURL + " is online.");

  if(null != $.cookie("mnc_server_last"))
  {
    configServerDefault();
  }
  else
  {
    configMsg("Please enter the address of your server and click [Refresh List].");
  }

  $(configLoading).css("visibility", "hidden");

  buttonMake("#serverrefresh" , function(){configServerRefresh();});
  buttonMake("#serverselect"  , function(){configServerSelect();});

  $("#serverinput").keyup(function(event){if(event.keyCode == 13){configServerRefresh();}})
}

function configProxyOffline()
{
  configMsg("Proxy at " + proxyURL + " is offline.");
  configMsg("Please try again at a later time.");

  $(configLoading).css("visibility", "hidden");
}

function configServerListDone()
{
  serverIP = $("#serverinput").val();

  $.cookie("mnc_server_last", serverIP, {expires: 365});

  configEmpty();

  for(var i = 0; i < serverList.length; i++)
  {
    configRow(serverList[i].name, serverList[i].port);

    var name = "mnc_" + serverIP.replace(/\./g, "_") + "_" + serverList[i].port;

    $.cookie(name, serverList[i].name, {expires: 365})
  }

  configFill();

  $(configLoading).css("visibility", "hidden");

  if(null != $.cookie(serverIP.replace(/\./g, "_")))
  {
    configMsg("Using server selection of previous session.");
    configMsg("Press [Select Server] to select the highlighted server.");

    configServerClick($.cookie(serverIP.replace(/\./g, "_")));
  }
  else
  {
    configMsg("Select one of the listed servers and press [Select Server].");
  }
}

function configServerListFail()
{
  configMsg("No servers were found.");
  configMsg("Please check the address and try again.");

  $(configLoading).css("visibility", "hidden");
}

function configServerRefresh()
{
  if("" != $("#serverinput").val())
  {
    configEmpty();
    configFill();

    serverPort = -1;

    if(true == serverListRequest($("#serverinput").val(), function(){configServerListDone();}, function(){configServerListFail();}))
    {
      configMsg("Searching for MNC servers ...");

      $(configLoading).css("visibility", "visible");
    }
  }
}

function configServerClick(port)
{
  for(var i = 0; i < serverList.length; i++)
  {
    $("#" + serverList[i].port).css("color", "#FFFFFF");
  }

  $("#" + port).css("color", "#FFFF00");

  serverPort = port;
}

function configServerSelect()
{
  if(-1 == serverPort)
  {
    return;
  }

  var key  = "key_" + serverIP.replace(/\./g, "_") + "_" + serverPort;
  var name = "mnc_" + serverIP.replace(/\./g, "_") + "_" + serverPort;

  $.cookie(serverIP.replace(/\./g, "_"), serverPort, {expires: 365});

  if(null == $.cookie(key))
  {
    configMsg("Server details unknown. Please enter the following details.");

    $("#configweb").css("visibility", "visible");

    var webport = "<web admin port>";
    var webuser = "<username>";
    var webpass = "<password>";

    $("#webport").val(webport);
    $("#webuser").val(webuser);
    $("#webfake").val(webpass);

    $("#webport").focusin(function(){if($("#webport").val() == webport){$("#webport").val("")}});
    $("#webport").focusout(function(){if($("#webport").val() == ""){$("#webport").val(webport)}});

    $("#webuser").focusin(function(){if($("#webuser").val() == webuser){$("#webuser").val("")}});
    $("#webuser").focusout(function(){if($("#webuser").val() == ""){$("#webuser").val(webuser)}});

    $("#webfake").focusin(function(){$("#webfake").hide(); $("#webpass").show().focus();});
    $("#webpass").focusout(function(){if($("#webpass").val() == ""){$("#webpass").hide(); $("#webfake").show();}});

    buttonMake("#configwebsubmit", function(){configRegister();});

    // disable all selectable servers
    $(configTable + " td").unbind("mouseenter").unbind("mouseleave").unbind("click");
    $(configTable + " td").css("cursor", "default");
  }
  else
  {
    configMsg("Using server " + $.cookie(name));
    configMsg("Authorizing client...");

    $("#configweb").css("visibility", "hidden");

    serverKey = $.cookie(key);

    authorizeRequest(function(){configAuthorizeDone();}, function(){configAuthorizeFail();});
  }
}

var webAdminRegister = false;

function configRegister()
{
  if(false == webAdminRegister)
  {
    if("" == $("#webport").val() ||
       "" == $("#webuser").val() ||
       "" == $("#webpass").val())
    {
      return;
    }

    configMsg("Requesting encryption key from proxy...");

    $(configLoading).css("visibility", "visible");

    publicKeyRequest(function(){configPublicKeyDone();}, function(){configPublicKeyFail();});

    webAdminRegister = true;
  }
}

function configPublicKeyDone()
{
  if("" == publicKey || false == webAdminRegister)
  {
    return;
  }

  $(configLoading).css("visibility", "hidden");

  configMsg("Encrypting web admin details.");

  var rsa = new RSAKey();

  rsa.setPublic(publicKey, "010001"); /* default exponent */

  var web  = encodeURIComponent(hex2b64(rsa.encrypt($("#webport").val())));
  var user = encodeURIComponent(hex2b64(rsa.encrypt($("#webuser").val())));
  var pass = encodeURIComponent(hex2b64(rsa.encrypt($("#webpass").val())));

  configMsg("Registering with proxy...");

  $(configLoading).css("visibility", "visible");

  serverRegisterRequest(web, user, pass, function(){configRegisterDone();}, function(){configRegisterFail();});
}

function configPublicKeyFail()
{
  configMsg("Failed to retrieve encryption key from proxy.");
  configMsg("Unable to register web admin details.");

  $(configLoading).css("visibility", "hidden");

  webAdminRegister = false;
}

function configRegisterDone()
{
  if("" == serverKey || false == webAdminRegister)
  {
    return;
  }

  $(configLoading).css("visibility", "hidden");

  var key = "key_" + serverIP.replace(/\./g, "_") + "_" + serverPort;

  $.cookie(key, serverKey, {expires: 365});

  configMsg("Succesfully registered with proxy.");
  configMsg("Authorizing client for server polling...");

  $(configLoading).css("visibility", "visible");

  authorizeRequest(function(){configAuthorizeDone();}, function(){configAuthorizeFail();});
}

function configRegisterFail()
{
  configMsg("Failed to register web admin details with proxy.");

  $(configLoading).css("visibility", "hidden");

  webAdminRegister = false;
}

function configAuthorizeDone()
{
  configMsg("Successfully authorized client with proxy.");
  configMsg("Have fun!");

  $(configLoading).css("visibility", "hidden");

  webAdminRegister = false;

  configToggle();

  clientStart();
}

function configAuthorizeFail()
{
  configMsg("Failed to authorize client with proxy.");
  configMsg("Clearing server key.");
  configMsg("Please re-register with the proxy.");

  $(configLoading).css("visibility", "hidden");

  webAdminRegister = false;

  var key = "key_" + serverIP.replace(/\./g, "_") + "_" + serverPort;

  $.cookie(key, null);

  configServerSelect()
}

/* server list */

var serverList = [];

var serverListActive  = false;

var serverListDone;
var serverListFail;

function serverListUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.ServerList) return;

  while(serverList.length > 0) serverList.pop();

  for(var i = 0; i < data.ServerList.length; i++)
  {
    serverList.push({name:data.ServerList[i].Name, port:data.ServerList[i].Port});
  }

  if(undefined != serverListDone) serverListDone();
}

function serverListSuccess(data, textStatus, jqXHR)
{
  serverListUpdate(data);
}

function serverListError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  serverListActive = false;

  if(undefined != serverListFail) serverListFail();
}

function serverListComplete(jqXHR, textStatus)
{
  serverListActive = false;
}

function serverListRequest(ip, done, fail)
{
  if(false == serverListActive && true == proxyOnline)
  {
    ServerCommand("request=serverlist&ip=" + ip,
                  serverListSuccess  ,
                  serverListError    ,
                  serverListComplete ,
                  30000); /* the only call that requires a large timeout */

    serverListActive = true;

    serverListDone = done;
    serverListFail = fail;

    return true;
  }

  return false;
}

/* authorize */

var authorized = false;

var authorizeActive  = false;

var authorizeDone;
var authorizeFail;

function authorizeUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.Authorization) return;

  authorized = "Success" == data.Authorization ? true : false;

  if(undefined != authorizeDone) authorizeDone();
}

function authorizeSuccess(data, textStatus, jqXHR)
{
  authorizeUpdate(data);
}

function authorizeError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  authorizeActive = false;

  if(undefined != authorizeFail) authorizeFail();
}

function authorizeComplete(jqXHR, textStatus)
{
  authorizeActive = false;
}

function authorizeRequest(done, fail)
{
  if(false == authorizeActive && true == proxyOnline)
  {
    ServerCommand("request=authorize&ip=" + serverIP + "&port=" + serverPort,
                  authorizeSuccess  ,
                  authorizeError    ,
                  authorizeComplete);

    authorizeActive = true;

    authorizeDone = done;
    authorizeFail = fail;

    return true;
  }

  return false;
}

/* register */

var serverRegisterActive  = false;

var serverRegisterDone;
var serverRegisterFail;

function serverKeyUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.Key) return;

  serverKey = data.Key;

  if(undefined != serverRegisterDone) serverRegisterDone();
}

function serverRegisterSuccess(data, textStatus, jqXHR)
{
  serverKeyUpdate(data);
}

function serverRegisterError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  serverRegisterActive = false;

  if(undefined != serverRegisterFail) serverRegisterFail();
}

function serverRegisterComplete(jqXHR, textStatus)
{
  serverRegisterActive = false;
}

function serverRegisterRequest(web, user, pass, done, fail)
{
  if(false == serverRegisterActive && true == proxyOnline)
  {
    ServerCommand("request=register&ip=" + serverIP + "&port=" + serverPort + "&web=" + web + "&user=" + user + "&pass=" + pass,
                  serverRegisterSuccess  ,
                  serverRegisterError    ,
                  serverRegisterComplete);

    serverRegisterActive = true;

    serverRegisterDone = done;
    serverRegisterFail = fail;

    return true;
  }

  return false;
}

/* public key */

var publicKey = "";

var publicKeyActive  = false;

var publicKeyDone;
var publicKeyFail;

function publicKeyUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.PublicKey) return;

  publicKey = data.PublicKey;

  if(undefined != publicKeyDone) publicKeyDone();
}

function publicKeySuccess(data, textStatus, jqXHR)
{
  publicKeyUpdate(data);
}

function publicKeyError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  publicKeyActive = false;

  if(undefined != publicKeyFail) publicKeyFail();
}

function publicKeyComplete(jqXHR, textStatus)
{
  publicKeyActive = false;
}

function publicKeyRequest(done, fail)
{
  if(false == publicKeyActive && true == proxyOnline)
  {
    ServerCommand("request=publickey&ip=" + serverIP + "&port=" + serverPort ,
                  publicKeySuccess  ,
                  publicKeyError    ,
                  publicKeyComplete);

    publicKeyActive = true;

    publicKeyDone = done;
    publicKeyFail = fail;

    return true;
  }

  return false;
}

/* proxy */

var proxyOnline         = false;
var proxyOnlineActive   = false;

var proxyOnlineDone;
var proxyOnlineFail;

function proxyUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.Online) return;

  proxyOnline = "True" == data.Online ? true : false;

  if(undefined != proxyOnlineDone) proxyOnlineDone();
}

function proxyOnlineSuccess(data, textStatus, jqXHR)
{
  proxyUpdate(data);
}

function proxyOnlineError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  proxyOnlineActive = false;

  proxyOnline = false;

  if(undefined != proxyOnlineFail) proxyOnlineFail();
}

function proxyOnlineComplete(jqXHR, textStatus)
{
  proxyOnlineActive = false;
}

function proxyOnlineRequest(done, fail)
{
  if(false == proxyOnlineActive)
  {
    ServerCommand("request=online"    ,
                  proxyOnlineSuccess  ,
                  proxyOnlineError    ,
                  proxyOnlineComplete);

    proxyOnlineDone = done;
    proxyOnlineFail = fail;

    proxyOnlineActive = true;
  }
}

var PLAYER_STATUS = {
  PLAYER_CREATED : {value: 0 },
  PLAYER_RESET   : {value: 1 },
  PLAYER_LISTED  : {value: 2 },
  PLAYER_REQUEST : {value: 3 },
  PLAYER_UPDATED : {value: 4 }
}

var playerTable    = "#playertable";
var playerSelected = -1;

function Player(id, name)
{
  this.id               = id;
  this.name             = name;
  this.escapedName      = "";
  this.status           = PLAYER_STATUS.PLAYER_CREATED;

  /* general stats */
  this.isAdmin          = false;
  this.clanTag          = 0 ;
  this.level            = 0 ;
  this.emblem           = 0 ;
  this.prestige         = 0 ;
  this.ping             = 0 ;
  this.lifeTimeEarnings = 0 ;
  this.totalPoints      = 0 ;
  this.totalKills       = 0 ;
  this.totalAssists     = 0 ;
  this.totalDeaths      = 0 ;
  this.totalWins        = 0 ;
  this.totalLosses      = 0 ;
  this.totalKillStreak  = 0 ;

  /* match specific stats */
  this.ispectator       = true;
  this.startTime        = 0 ;
  this.team             = 255 ;
  this.character        = 0 ;
  this.kills            = 0 ;
  this.assists          = 0 ;
  this.deaths           = 0 ;
  this.points           = 0 ;
  this.bestKillStreak   = 0 ;
  this.bestMultiKill    = 0 ;
  this.juiceSingleLife  = 0 ;
  this.juices           = 0 ;
  this.botKills         = 0 ;
  this.turretKills      = 0 ;
  this.turretsbuilt     = 0 ;
  this.hazardsUsed      = 0 ;
}

function playerCharacterIcon(character)
{
  var icon = "<image src=\"";

  switch(character)
  {
    case 0  : icon += "style/images/icon-class-assault.png";

              break;

    case 1  : icon += "style/images/icon-class-tank.png";

              break;

    case 2  : icon += "style/images/icon-class-support.png";

              break;

    case 3  : icon += "style/images/icon-class-assassin.png";

              break;

    case 4  : icon += "style/images/icon-class-gunner.png";

              break;

    case 5  : icon += "style/images/icon-class-sniper.png";

              break;

    default : return "&nbsp;";

              break;
  }

  icon += "\" width=\"24\"></image>";

  return icon;
}

function playerAllStarIcon(level)
{
  var icon = "<image src=\"";

  switch(level)
  {
    case 0  : return "&nbsp;";

              break;

    case 1  : icon += "style/images/icon-bot-slim.gif";

              break;

    case 2  : icon += "style/images/icon-bot-buzzer.gif";

              break;

    case 3  : icon += "style/images/icon-bot-gremlin.gif";

              break;

    case 4  : icon += "style/images/icon-bot-scrambler.gif";

              break;

    case 5  : icon += "style/images/icon-bot-blackjack.gif";

              break;

    case 6  : icon += "style/images/icon-bot-gapshot.gif";

              break;

    case 7  : icon += "style/images/icon-bot-bouncer.gif";

              break;

    case 8  : icon += "style/images/icon-bot-jackbot.gif";

              break;


    default : return "&nbsp;";

              break;
  }

  icon += "\" width=\"24\"></image>";

  return icon;
}

function playerStatsRow(leftName, leftValue, rightName, rightValue)
{
  var msg = "<tr";

  if(0 == $(playerTable + " tr").length % 2)
  {
    msg += " class=\"pstralt\"";
  }

  msg += ">";

  msg += "<td width=\"194\">" + leftName  + "</td><td width=\"98\">" + leftValue  + "</td>";
  msg += "<td width=\"194\">" + rightName + "</td><td width=\"98\">" + rightValue + "</td>";

  msg += "</tr>";

  $(playerTable + " > tbody:last").append(msg);
}

function playerStatsFill()
{
  var msg, kickid, banid, index;
  var player = undefined;

  if(-1 != (index = playerListFind(playerSelected)))
  {
    player = playerList[index];

    banid  = "ban"  + playerSelected;
    kickid = "kick" + playerSelected;
  }
  else
  {
    playerSelected = -1;

    banid  = "ban";
    kickid = "kick";
  }

  var title            = player ? player.name                               : "Please select a player";
  var icon             = player ? playerAllStarIcon(player.prestige)        : playerAllStarIcon(0);
  var level            = player ? player.level                              : "";

  var lifeTimeEarnings = player ? moneyPrint(player.lifeTimeEarnings)       : nop();
  var totalKills       = player ? player.totalKills                         : nop();
  var totalDeaths      = player ? player.totalDeaths                        : nop();
  var totalWins        = player ? player.totalWins                          : nop();
  var totalLosses      = player ? player.totalLosses                        : nop();
  var totalKillStreak  = player ? player.totalKillStreak                    : nop();
  var killDeathRatio   = player ? numberRound(totalKills / totalDeaths, 3)  : nop();

  var bestKillStreak   = player ? player.bestKillStreak                     : nop();
  var bestMultiKill    = player ? player.bestMultiKill                      : nop();
  var juiceSingleLife  = player ? player.juiceSingleLife                    : nop();
  var juices           = player ? player.juices                             : nop();
  var turretKills      = player ? player.turretKills                        : nop();
  var turretBuilds     = player ? player.turretBuilds                       : nop();
  var hazardsUsed      = player ? player.hazardsUsed                        : nop();

  $(playerTable).empty();
  $(playerTable).append("<tbody></tbody>");

  msg = "<tr class=\"sttrhilite\">";
  msg += "<td width=\"292\" colspan=\"2\" style=\"color:#FFFF00; text-align:center;\">All Time</td>";
  msg += "<td width=\"292\" colspan=\"2\" style=\"color:#FFFF00; text-align:center;\">Current Match</td>";
  msg += "</tr>";

  msg += "<tr style=\"height:1px; background-color:#FFFFFF\"><td colspan=\"4\"></td></tr>";

  $(playerTable + " > tbody:last").append(msg);

  playerStatsRow("Lifetime Earnings"  , lifeTimeEarnings , "Best Kill Streak"       , bestKillStreak  );
  playerStatsRow("Total Wins"         , totalWins        , "Best Multi Kill"        , bestMultiKill   );
  playerStatsRow("Total Losses"       , totalLosses      , "Juices in single life"  , juices          );
  playerStatsRow("Total Kills"        , totalKills       , "Number of juices"       , juiceSingleLife );
  playerStatsRow("Total Deaths"       , totalDeaths      , "Turret Kills"           , turretKills     );
  playerStatsRow("Kill / Death Ratio" , killDeathRatio   , "Turret Builds"          , turretBuilds    );
  playerStatsRow("Best Kill Streak"   , totalKillStreak  , "Hazards Used"           , hazardsUsed     );

  msg = "<tr style=\"height:1px; background-color:#FFFFFF\"><td colspan=\"4\"></td></tr>";

  msg += "<tr class=\"sttrhilite\">";
  msg += "<td colspan=\"2\" style=\"text-align:center;\" id=\"" + banid  + "\">Ban Player</td>";
  msg += "<td colspan=\"2\" style=\"text-align:center;\" id=\"" + kickid + "\">Kick Player</td>";
  msg += "</tr>";

  $(playerTable + " > tbody:last").append(msg);

  $("#playername").html("<span class=\"headertext\" style=\"padding-right:10px;\">" + title + "</span>");
  $("#playericon").html(icon);
  $("#playerlevel").html("<span class=\"headertext\">" + level + "</span>");

  if(player)
  {
    buttonMake("#" + kickid , function(){playerActionConfirm("kick", title, playerSelected, playerKick);});
    buttonMake("#" + banid  , function(){playerActionConfirm("ban" , title, playerSelected, playerBan);});
  }
}

function playerActionConfirm(action, name, id, func)
{
  if(true == confirm("Are you sure you wish to " + action + " player: " + name + " (" + id + ") ?"))
  {
    func(id);
  }
}

function playerKickSuccess(data, textStatus, jqXHR)
{
  //
}

function playerKickError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");
}

function playerKickComplete(jqXHR, textStatus)
{
  //
}

function playerKick(id)
{
  ServerCommand("request=kick&id=" + id    ,
                playerKickSuccess  ,
                playerKickError    ,
                playerKickComplete );
}

function playerBanSuccess(data, textStatus, jqXHR)
{
  //
}

function playerBanError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");
}

function playerBanComplete(jqXHR, textStatus)
{
  //
}

function playerBan(id)
{
  ServerCommand("request=kickban&id=" + id  ,
                playerBanSuccess    ,
                playerBanError      ,
                playerBanComplete   );
}

var playerDetailsCounter = 0;
var playerDetailsTImer   = 0;
var playerDetailsActive  = false;

function playerDetailsUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.PlayerDetails) return;

  var index = playerListFind(data.PlayerDetails.Id);

  if(-1 == index) /* sanity check */
  {
    errorLog("request for player details for unknown player:" + data.PlayerDetails.Id);

    return;
  }

  playerList[index].escapedName      = data.PlayerDetails.Name;
  playerList[index].isAdmin          = data.PlayerDetails.bAdmin;
  playerList[index].clanTag          = data.PlayerDetails.ClanTag;
  playerList[index].level            = data.PlayerDetails.PlayerLevel;
  playerList[index].emblem           = data.PlayerDetails.PlayerEmblem;
  playerList[index].prestige         = data.PlayerDetails.PlayerAllStarLevel;
  playerList[index].ping             = data.PlayerDetails.ExactPing;
  playerList[index].lifeTimeEarnings = data.PlayerDetails.LifeTimePlayerStats0;
  playerList[index].totalPoints      = data.PlayerDetails.LifeTimePlayerStats1;
  playerList[index].totalKills       = data.PlayerDetails.LifeTimePlayerStats2;
  playerList[index].totalAssists     = data.PlayerDetails.LifeTimePlayerStats3;
  playerList[index].totalDeaths      = data.PlayerDetails.LifeTimePlayerStats4;
  playerList[index].totalWins        = data.PlayerDetails.LifeTimePlayerStats5;
  playerList[index].totalLosses      = data.PlayerDetails.LifeTimePlayerStats6;
  playerList[index].totalKillStreak  = data.PlayerDetails.LifeTimePlayerStats7;

  playerList[index].ispectator       = data.PlayerDetails.bIsSpectator;
  playerList[index].startTime        = data.PlayerDetails.StartTime;
  playerList[index].team             = data.PlayerDetails.Team;
  playerList[index].character        = data.PlayerDetails.DesiredCharacter;
  playerList[index].kills            = data.PlayerDetails.InGamePlayerStats0;
  playerList[index].assists          = data.PlayerDetails.InGamePlayerStats1;
  playerList[index].deaths           = data.PlayerDetails.InGamePlayerStats2;
  playerList[index].points           = data.PlayerDetails.InGamePlayerStats3;
  playerList[index].bestKillStreak   = data.PlayerDetails.InGamePlayerStats4;
  playerList[index].bestMultiKill    = data.PlayerDetails.InGamePlayerStats5;
  playerList[index].juiceSingleLife  = data.PlayerDetails.InGamePlayerStats6;
  playerList[index].juices           = data.PlayerDetails.InGamePlayerStats7;
  playerList[index].botKills         = data.PlayerDetails.InGamePlayerStats8;
  playerList[index].turretKills      = data.PlayerDetails.InGamePlayerStats9;
  playerList[index].turretBuilds     = data.PlayerDetails.InGamePlayerStats10;
  playerList[index].hazardsUsed      = data.PlayerDetails.InGamePlayerStats12;

  playerList[index].status           = PLAYER_STATUS.PLAYER_UPDATED;
}

function playerDetailsDone()
{
  if(playerDetailsCounter <= 0)
  {
    playerDetailsActive = false;

    playerDetailsCounter = 0;
  }
}

function playerDetailsSafe()
{
  var result = false;

  switch(Server.status)
  {
    case SERVER_STATUS.MATCH_ACTIVE   : result = true;

                                        break;

    case SERVER_STATUS.HOSTILE_LOBBY  :
    case SERVER_STATUS.TRANSITION     :
    case SERVER_STATUS.MATCH_START    :
    case SERVER_STATUS.MATCH_END      :
    case SERVER_STATUS.UNKNOWN        : result = false;

                                        break;
  }

  return result;
}

function playerDetailsSuccess(data, textStatus, jqXHR)
{
  playerDetailsUpdate(data);
}

function playerDetailsError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  playerDetailsCounter = 0;

  playerDetailsDone();
}

function playerDetailsComplete(jqXHR, textStatus)
{
  playerDetailsCounter--;

  playerDetailsDone();
}

function playerDetailsRequest()
{
  if(false == playerDetailsActive)
  {
    if(true == playerDetailsSafe())
    {
      for(var i = 0; i < playerList.length; i++)
      {
        ServerCommand("request=playerdetails&id=" + playerList[i].id ,
                      playerDetailsSuccess            ,
                      playerDetailsError              ,
                      playerDetailsComplete           );

        playerDetailsCounter++;
      }

      if(playerDetailsCounter > 0) playerDetailsActive = true;
    }
  }

  playerDetailsTimer = setTimeout(function(event){playerDetailsRequest();}, defaultTimeOut);
}

var playerListTimer  = 0;
var playerListActive = false;
var playerList       = [];
var playerNop        = "0x0000000000000000";

var hotShotsTable    = "#hotshotstable";
var hotShotsRows     = 6;

var iceMenTable      = "#icementable";
var iceMenRows       = 6;

function playerTableEmpty(table)
{
  $(table).empty();
  $(table).append("<tbody></tbody>");
}

function playerTableRow(table, player)
{
  var rowid     = table.substring(1) + "" + $(table + " tr").length;
  var colid     = player ? player.id : -1;

  var icon      = player ? playerCharacterIcon(player.character) : nop();
  var name      = player ? player.name                           : nop();
  var ping      = player ? pingPrint(player.ping)                : nop();
  var kills     = player ? player.kills                          : nop();
  var assists   = player ? player.assists                        : nop();
  var deaths    = player ? player.deaths                         : nop();
  var botKills  = player ? player.botKills                       : nop();
  var points    = player ? moneyPrint(player.points)             : nop();

  var msg = "<tr id=\"" + rowid + "\">";

  msg += "<td style=\"text-align: center\" width=\"26\">" + icon + "</td>";
  msg += "<td id=\"" + colid + "\" style=\"text-align: left\" width=\"264\">" + name + "</td>";

  msg += "<td width=\"40\">" + ping     + "</td>";
  msg += "<td width=\"40\">" + kills    + "</td>";
  msg += "<td width=\"40\">" + assists  + "</td>";
  msg += "<td width=\"40\">" + deaths   + "</td>";
  msg += "<td width=\"40\">" + botKills + "</td>";
  msg += "<td width=\"60\">" + points   + "</td>";
  msg += "<td>"              + "&nbsp;" + "</td>";

  msg += "</tr>";

  $(table + " > tbody:last").append(msg);

  $("#"+rowid).mouseenter(function(){$(this).addClass('pttrhilite');});
  $("#"+rowid).mouseleave(function(){$(this).removeClass('pttrhilite');});

  if(-1 != colid)
  {
    buttonMake("#" + colid, function(){playerSelected = player.id; playerStatsFill();});
  }
}

function playerTableFill(table, numRows)
{
  if(0 == $(table + " tbody").length)
  {
    $(table).append("<tbody></tbody>");
  }

  while($(table + " tr").length < numRows)
  {
    playerTableRow(table);
  }

  $(table + " tr:even").addClass("pttr");
  $(table + " tr:odd").addClass("pttralt");
}

function playerListFill()
{
  playerTableFill(hotShotsTable, hotShotsRows);
  playerTableFill(iceMenTable, iceMenRows);
}

function playerListEmpty()
{
  playerTableEmpty(hotShotsTable);
  playerTableEmpty(iceMenTable);
}

function playerListSort(a, b)
{
  return b.points - a.points;
}

function playerListFind(id)
{
  for(var i = 0; i < playerList.length; i++)
  {
    if(playerList[i].id == id)
    {
      return i;
    }
  }

  return -1;
}

function playerListInvalidEntry()
{
  for(var i = 0; i < playerList.length; i++)
  {
    if(PLAYER_STATUS.PLAYER_RESET == playerList[i].status)
    {
      return i;
    }
  }

  return -1;
}

function playerListUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.PlayerList) return;

  // reset the player status

  for(var i = 0; i < playerList.length; i++)
  {
    playerList[i].status = PLAYER_STATUS.PLAYER_RESET;
  }

  // process the retrieved player list

  for(var i = 0; i < data.PlayerList.length; i++)
  {
    var index;

    var id = data.PlayerList[i].Id;

    if(playerNop == id) continue; /* 0x0000000000000000 is the ID of newly joined player - they'll be done next polling */

    // add a new player to the list if necessary

    if(-1 == (index = playerListFind(id)))
    {
      playerList.push(new Player(id, data.PlayerList[i].Name));

      index = playerListFind(id);
    }

    // update the status of all listed players

    playerList[index].status = PLAYER_STATUS.PLAYER_LISTED;
  }

  // any player without an updated status is no longer present on the server

  var foo;

  while(-1 != (foo = playerListInvalidEntry()))
  {
    var player = playerList.splice(foo, 1);

    delete player;
  }
}

function playerListRefresh()
{
  playerListEmpty();

  if(Server.status == SERVER_STATUS.MATCH_ACTIVE)
  {
    playerList.sort(playerListSort);

    for(var i = 0; i < playerList.length; i++)
    {
      switch(playerList[i].team)
      {
        case 0 : playerTableRow(hotShotsTable, playerList[i]);

                 break;

        case 1 : playerTableRow(iceMenTable, playerList[i]);

                 break;
      }
    }
  }

  playerListFill();

  if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
  {
    $("#icementitle").css("color", "#FFFFFF");
    $("#hotshotstitle").css("color", "#FFFFFF");
  }

  playerListActive = false;
}

function playerListSafe()
{
  var result = false;

  switch(Server.status)
  {
    case SERVER_STATUS.MATCH_ACTIVE   : result = true;

                                        break;

    case SERVER_STATUS.HOSTILE_LOBBY  :
    case SERVER_STATUS.TRANSITION     :
    case SERVER_STATUS.MATCH_START    :
    case SERVER_STATUS.MATCH_END      :
    case SERVER_STATUS.UNKNOWN        : result = false;

                                        break;
  }

  return result;
}

function playerListSuccess(data, textStatus, jqXHR)
{
  playerListUpdate(data);
}

function playerListError(jqXHR, textStatus, errorThrown)
{
  errorLog("[playerlist] " + textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  playerListActive = false;
}

function playerListComplete(jqXHR, textStatus)
{
  // refresh the tables

  playerListRefresh();
  playerStatsFill();
}

function playerListRequest()
{
  if(true == playerListSafe())
  {
    if(false == playerListActive)
    {
      ServerCommand("request=playerlist" ,
                    playerListSuccess   ,
                    playerListError     ,
                    playerListComplete );

      playerListActive = true;

      if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
      {
        $("#icementitle").css("color", "#00CC00");
        $("#hotshotstitle").css("color", "#00CC00");
      }
    }
  }

  playerListTimer = setTimeout(function(event){playerListRequest();}, defaultTimeOut);
}

var SERVER_STATUS = {
  UNKNOWN       : {value: 0, name: "Unknown"           },
  MATCH_START   : {value: 1, name: "Match Start"       },
  MATCH_ACTIVE  : {value: 2, name: "Match In Progress" },
  MATCH_END     : {value: 3, name: "Match End"         },
  HOSTILE_LOBBY : {value: 4, name: "Waiting In Lobby"  },
  TRANSITION    : {value: 5, name: "In Transition"     },
  OFFLINE       : {value: 6, name: "Server Offline"    }
}

var serverTimer   = 0;
var serverActive  = false;
var serverRows    = 14;
var serverTable   = "#servertable";
var serverTimeOut = defaultTimeOut;

function serverStarRating(rating)
{
  var msg = "";

  if(0 == rating)
  {
    return "Unknown";
  }

  for(var i = 0; i < rating; i++)
  {
    msg += "<image src=\"style/images/icon-server-rating.png\" height=\"19\"></image>";
  }

  return msg;
}

function serverStatusRow(name, value)
{
  var msg = "<tr><td width=\"160\" style=\"padding-left: 5px;\">" + name  + "</td><td>" + value + "</td></tr>";

  $(serverTable + " > tbody:last").append(msg);
}

function serverStatusEmpty()
{
  $(serverTable).empty();
  $(serverTable).append("<tbody></tbody>");
}

function serverStatusFill()
{
  var html;

  serverStatusEmpty();

  html = "<tr><td colspan=\"2\" style=\"text-align:center; color:#FFFF00;\">" + Server.name + "</td></tr>";

  $(serverTable + " > tbody:last").append(html);

  serverStatusRow("Max Star Rating"       , serverStarRating(Server.maxStarRating));
  serverStatusRow("Custom Classes"        , booleanPrint(Server.allowCustomClass));
  serverStatusRow("Class Changes"         , booleanPrint(Server.allowClassChange));
  serverStatusRow("Random Class"          , booleanPrint(Server.forceRandomClass));
  serverStatusRow("Allow Team Select"     , booleanPrint(Server.allowTeamSelect));
  serverStatusRow("Auto-Balance"          , booleanPrint(Server.autoBalance));
  serverStatusRow("Time Limit"            , timePrint(Server.timeLimit));
  serverStatusRow("Overtime Limit"        , timePrint(Server.otTimeLimit));
  serverStatusRow("Status"                , Server.status.name);
  serverStatusRow("Current Map"           , Server.mapName);
  serverStatusRow("Elapsed Time"          , timePrint(Server.elapsedTime));
  serverStatusRow("Winning Team"          , Server.winningTeam);

  html = "<tr><td colspan=\"2\" style=\"text-align:center;\" id=\"viewbanlist\">View Ban List</td></tr>";

  $(serverTable + " > tbody:last").append(html);

  buttonMake("#viewbanlist", function(){banListToggle();});

  $(serverTable + " tr:odd").addClass("sttralt");
}

var Server = new function()
{
  this.name               = "Unknown" ;
  this.updatedInfo        = false ;

  this.allowCustomClass   = false ;
  this.allowClassChange   = false ;
  this.forceRandomClass   = false ;
  this.allowTeamSelect    = false ;
  this.autoBalance        = false ;
  this.maxStarRating      = 0 ;

  this.mapName            = "Unknown" ;
  this.status             = SERVER_STATUS.UNKNOWN ;

  this.matchHasBegun      = false ;
  this.matchIsOver        = false ;

  this.elapsedTime        = 0 ;
  this.timeLimit          = 0 ;
  this.otTimeLimit        = 0 ;
  this.timeToRollOver     = 0 ;
  this.winningTeam        = "Unknown" ;
}

function serverStatusUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.ServerStatus) return;

//var serverName       = data.ServerStatus.ServerName;
//var remainingTime    = data.ServerStatus.RemainingTime;
  var elapsedTime      = data.ServerStatus.ElapsedTime;
//var remainingMin     = data.ServerStatus.RemainingMinute;
  var timeLimit        = data.ServerStatus.TimeLimit;
  var otTimeLimit      = data.ServerStatus.OTTimeLimit;
  var matchHasBegun    = data.ServerStatus.bMatchHasBegun;
  var matchIsOver      = data.ServerStatus.bMatchIsOver;
//var messageOfTheDay  = data.ServerStatus.MessageOfTheDay;
//var playlistID       = data.ServerStatus.PlayListID;
//var matchElapsed     = data.ServerStatus.MatchElapsed;
  var winningTeam      = data.ServerStatus.WinningTeamIndex;
  var timeToRollOver   = data.ServerStatus.TimeToRollOver;
//var isOverTime       = data.ServerStatus.bIsOvertime;
//var allowCustomClass = data.ServerStatus.AllowCustomClass;
//var allowClassChange = data.ServerStatus.AllowClassChange;
//var forceRandomClass = data.ServerStatus.ForceRandomClass;

  Server.matchHasBegun  = "True" == matchHasBegun ? true : false ;
  Server.matchIsOver    = "True" == matchIsOver   ? true : false ;

  Server.elapsedTime    = elapsedTime;
  Server.timeLimit      = timeLimit;
  Server.otTimeLimit    = otTimeLimit;
  Server.timeToRollOver = timeToRollOver;

  if(255 != winningTeam)
  {
    0 == winningTeam ? Server.winningTeam = "<span style=\"color:#fc6902;\">Hot Shots</span>" : Server.winningTeam = "<span style=\"color:#00B7EB;\">Icemen</span>";
  }
  else
  {
    Server.winningTeam = "Unknown";
  }
}

function serverStatus()
{
  if("HostileLobby" == Server.mapName)
  {
    Server.status = SERVER_STATUS.HOSTILE_LOBBY;

    Server.matchHasBegun  = false ;
    Server.matchIsOver    = false ;
    Server.winningTeam    = "Unknown";
    Server.elapsedTime    = 0 ;

    return;
  }

  if("Unknown" == Server.mapName)
  {
    Server.status = SERVER_STATUS.OFFLINE;

    return;
  }

  if("Unknown" != Server.mapName)
  {
    // fix (only happened once or twice)
    if(SERVER_STATUS.OFFLINE == Server.status)
    {
      Server.status = SERVER_STATUS.MATCH_START;
    }

    // if both booleans are false this is the match start
    if(false == Server.matchHasBegun && false == Server.matchIsOver)
    {
      Server.status = SERVER_STATUS.MATCH_START;
    }

    // if status is still lobby we assume the match has already started
    if(SERVER_STATUS.HOSTILE_LOBBY == Server.status)
    {
      Server.status = SERVER_STATUS.MATCH_START;
    }

    // if one boolean is true and one is false then the match is in progress
    if(true == Server.matchHasBegun && false == Server.matchIsOver)
    {
      if(SERVER_STATUS.MATCH_START == Server.status)
      {
        Server.status = SERVER_STATUS.MATCH_ACTIVE;
      }
    }

    // if both booleans are true the match has ended
    if(true == Server.matchHasBegun && true == Server.matchIsOver)
    {
      Server.status = SERVER_STATUS.MATCH_END;
    }

    // just a double check to make sure the match end has been detected
    if("Unknown" != Server.winningTeam)
    {
      if(SERVER_STATUS.MATCH_END != Server.status)
      {
        Server.status = SERVER_STATUS.MATCH_END;
      }
    }

    // if match has ended and rollover is less than 3 times
    // the default time-out we go into transition
    if(SERVER_STATUS.MATCH_END == Server.status)
    {
      var timeout = (serverTimeOut * 3) / 1000;

      if(Server.timeToRollOver < timeout)
      {
        Server.status = SERVER_STATUS.TRANSITION;

        playerSelected = 0;

        playerListRefresh();
        playerStatsFill();
      }
    }
  }
}

function serverStatusSafe()
{
  var result = false;

  switch(Server.status)
  {
    case SERVER_STATUS.MATCH_START    :
    case SERVER_STATUS.MATCH_END      :
    case SERVER_STATUS.MATCH_ACTIVE   : result = true;

                                        break;

    case SERVER_STATUS.HOSTILE_LOBBY  :
    case SERVER_STATUS.TRANSITION     :
    case SERVER_STATUS.UNKNOWN        : result = false;

                                        break;
  }

  return result;
}

function serverStatusSuccess(data, textStatus, jqXHR)
{
  serverStatusUpdate(data);
}

function serverStatusError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  serverActive = false;
}

function serverStatusComplete(jqXHR, textStatus)
{
  if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
  {
    $("#servertitle").css("color", "#ffffff");
  }

  serverActive = false;
}

function serverStatusRequest()
{
  if(false == serverActive)
  {
    if(true == serverStatusSafe())
    {
      ServerCommand("request=serverstatus" ,
                    serverStatusSuccess  ,
                    serverStatusError    ,
                    serverStatusComplete );

      serverActive = true;

      if(DEBUG_FLAG_REQUEST_HIGHLIGHT == (DEBUG_FLAG_REQUEST_HIGHLIGHT & debugMode))
      {
        $("#servertitle").css("color", "#00CC00");
      }
    }
  }

  serverTimer = setTimeout(function(event){serverStatusRequest();}, serverTimeOut);
}


var serverInfoTimer   = 0;
var serverInfoActive  = false;
var serverInfoTimeOut = defaultTimeOut * 10;

function durationCalculate(duration)
{
  var minutes = (duration * 5) + 5;

  return minutes * 60;
}

function overtimeCalculate(overtime)
{
  var minutes = overtime;

  return minutes * 60;
}

function serverInfoUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.ServerInfo) return;

  Server.name              = data.ServerInfo.ServerName;
  Server.allowCustomClass  = "True" == data.ServerInfo.bAllowCustomClass ? true : false ;
  Server.allowClassChange  = "True" == data.ServerInfo.bAllowChangeClass ? true : false ;
  Server.forceRandomClass  = "True" == data.ServerInfo.bForceRandomClass ? true : false ;
  Server.allowTeamSelect   = "True" == data.ServerInfo.bAllowTeamSelect  ? true : false ;
  Server.autoBalance       = "True" == data.ServerInfo.bAutoBalance      ? true : false ;
  Server.maxStarRating     = data.ServerInfo.MaxStarRating + 1;
  Server.mapName           = data.ServerInfo.MapName;
  Server.timeLimit         = durationCalculate(data.ServerInfo.MatchDuration);
  Server.otTimeLimit       = overtimeCalculate(data.ServerInfo.OTDuration);

  Server.updatedInfo       = true ;

  // data.ServerInfo.MapIndex
  // data.ServerInfo.NumberOfPlayers
  // data.ServerInfo.SizeOfPlayerList
  // data.ServerInfo.bAllowJuicePurch
  // data.ServerInfo.bAllowBotPurch
  // data.ServerInfo.bAllowHazards
  // data.ServerInfo.bAllowMascot
  // data.ServerInfo.MinNumToStart
}

function serverInfoSuccess(data, textStatus, jqXHR)
{
  serverInfoUpdate(data);
}

function serverInfoError(jqXHR, textStatus, errorThrown)
{
  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  serverInfoActive = false;
}

function serverInfoComplete(jqXHR, textStatus)
{
  serverInfoActive = false;
}

function serverInfoRequest()
{
  if(false == serverInfoActive)
  {
    ServerCommand("request=serverinfo" ,
                  serverInfoSuccess  ,
                  serverInfoError    ,
                  serverInfoComplete);

    serverInfoActive = true;
  }

  if(false == Server.updatedInfo)
  {
    serverInfoTimer = setTimeout(function(event){serverInfoRequest();}, serverInfoTimeOut);
  }
}


var serverMapTimer   = 0;
var serverMapActive  = false;
var serverMapTimeOut = 1000;

function serverMapUpdate(data)
{
  if(undefined == data) return;
  if(undefined == data.mapName) return;

  Server.mapName = data.mapName;

  serverStatus();

  serverStatusFill();
}

function serverMapSuccess(data, textStatus, jqXHR)
{
  serverMapUpdate(data);

  serverMapTimeOut = 1000; /* reset the time out value */
}

function serverMapError(jqXHR, textStatus, errorThrown)
{
  if("timeout" == textStatus)
  {
    debugLog("timeout for server map request - setting serverMapTimeOut to 10000");

    Server.mapName = "Unknown";

    serverStatus();

    serverStatusFill();

    serverMapTimeOut = 10000;
  }

  errorLog(textStatus + ": " + jqXHR.responseText + " (" + errorThrown + ")");

  serverMapActive = false;
}

function serverMapComplete(jqXHR, textStatus)
{
  serverMapActive = false;
}

function serverMapRequest()
{
  if(false == serverMapActive)
  {
    ServerCommand("request=servermap" ,
                  serverMapSuccess  ,
                  serverMapError    ,
                  serverMapComplete );

    serverMapActive = true;
  }

  serverMapTimer = setTimeout(function(event){serverMapRequest();}, serverMapTimeOut);
}

