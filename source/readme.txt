
################################################################

Monday Night Combat Dedicated Server Web Admin Tool v0.9.1 Beta

################################################################

Table of Contents

1 - Introduction
2 - License
3 - Package Contents
3 - Quick Install
4 - Requirements
5 - Functionality
6 - How to Set Up a Proxy
7 - FAQ

################################################################

1 - Introduction

################################################################

The Web Admin Tool is currently still in Beta stage.
This means that any usage is considered "testing" the tool.
No guarantees can be made concerning the reliability of the
tool, nor can anyone be held accountable for any damage
incurred through the usage of this tool.

That said, thank you for choosing Monday Night Combat Dedicated
Server Web Admin Tool technology!

This package consists of two parts:

 * Admin Tool (JavaScript based webpage)
 * PHP Proxy

The Admin Tool is an HTML page that utilizes ajax to retrieve
game data and display it on screen. The page can be hosted on
the Internet but can also be opened from a local drive.

The ajax calls are made to a PHP proxy server. In turn, the
PHP proxy server makes calls to the game server. A standard PHP
proxy server is always online and available but the source for
running your own PHP proxy server is included for anyone who
would prefer that option.

Most of this package is still in development, so please don't
be upset if information appears to be wrong or missing. Just
send an email to mnc-admin [at] detiege [dot] nl. I will try my
best to keep everything up to date.

################################################################

2 - License

################################################################

I'm not much for license stuff, but I have used some code from
other people and they do deserve to be mentioned:

 * jQuery
   Copyright 2011 John Resig
   http://jquery.org/

 * jQuery Cookie Plugin
   Copyright 2010 Klaus Hartl
   https://github.com/carhartl/jquery-cookie/

 * RSA and ECC in JavaScript
   Copyright 2003-2005 Tom Wu
   http://www-cs-students.stanford.edu/~tjw/jsbn/

 * Steam Condenser
   Copyright 2008-2011 Sebastian Staudt
   http://koraktor.de/steam-condenser/

################################################################

3 - Quick Install

################################################################

The quickest way to use the Admin Tool is to simply copy the
contents of this package to a local drive of your choice and
open the "index.html" file in your favourite browser.
Simply follow the instructions displayed in the config textbox
to set up the connection with the default PHP proxy.

The quickest way to set up the PHP proxy is to copy the files to
your web server and edit the config.php file with your database
details and use the SQL export to create the database table.

For more details on PHP proxy installation, please check Chapter
6 of this readme.

################################################################

4 - Requirements

################################################################

To run the Admin Tool you need a browser that is able to run
JavaScript. Next to that support for cookies is strongly
recommended. The tool has been tested on the following browsers:

 * Google Chrome 13.0
 * Internet Explorer 8.0
 * Opera 11.51
 * FireFox 6.0

The PHP proxy uses PHP 5 and the following extensions:

 * cURL
 * OpenSSL

################################################################

5 - Functionality

################################################################

 * Setting up a connection

The first time you open the tool in a browser you will see a
config window as an overlay on top of the page. The config
window will allow you to set up a connection to your game
server.

The config window is pretty much self-explanatory--just follow
the instructions displayed in the text box.

After choosing a server found at the address you specified, the
config tool will request your web admin port, username,
and password. These will be encrypted with a public key and sent
back to the PHP proxy server, that will use a private key to
decrypt this information. Once the proxy has these credentials,
it can query the game server for status updates.

Note that these steps are stored as cookie values. The next time
you open the Admin Tool in a web browser, the server list of the
last session is displayed and the server that was used last is
already selected. The key that was returned by the proxy during
registration is also retrieved from a cookie and used for quick
authentication.

 * Polling for information

Basically, the Admin Tool will make requests for status updates
at a steady interval and publish this information on the page.

The Admin Tool will request the map name from the PHP proxy
each second to determine whether the server has a game in
progress, is waiting in the lobby, or is in transition between
the two. This request is a steam condenser request, not a
web admin request.

The Monday Night Combat dedicated server can become unresponsive
if a web admin request is made at the wrong moment but
this is not the case when polled through the steam protocol,
hence the use of the steam condenser.

The map name will either be "HostileLobby," meaning that the
server is currently in between games or it will be one of the
playable arenas (e.g. DLC1_LazeRazor). Web admin requests are
only made during matches. This means that the player list, the
player details, the ban list, and the chat log will only be
updated during a live match.

Commands are also only available during a match round. This
means that you cannot send a chat to the server, kick, or ban a
player when the server is in transition mode or in the lobby.

################################################################

6 - How to setup a Proxy

################################################################

To set up the PHP proxy, a number of steps need to be taken. In
short, these steps are:

 * make sure the mnc admin table is present on the SQL database
 * make sure the public and private key files are present
   on the server
 * make sure the config.php file is filled out correctly
 * edit the settings.js file to use your new proxy address

The package contains an SQL export for the structure of the
table. You can simply execute this from phpMyAdmin or any other
database management tool. If you wish to use a different name
for the table, make sure the config.php file resembles this
name change.

The proxy utilizes OpenSSL for encryption and decryption of
sensitive information. A private key and public key are required
for this. These key values are stored in files on the server. The
proxy is capable of generating these keys but the hosted script
will most likely not have the rights to save these keys to file.

To check whether or not the proxy has access to the key files,
you can call the proxy with following command and see what is
displayed on the page:

 /proxy.php?request=publickey&ip=0&port=0&callback=foo

The response should look something like the following:

foo({"PublicKey": "e13c3c69d2e31efb3c467b3cf5d034104f4fbc14755e5
fc9172bcd35ecad0776096694c08b12460031c4c18633eb702d954775bceb927
a65060d584a818716283e36f0ffbd4b8f1c4f0b31b082b6bdd57e9bfda8684eb
39f0621db7f34862054521e7e7b162cdd5e50fb1f7eb9fc81f204abb76037bd4
39839c5d72c325e8adf"});

If the response does not resemble this, an error will be
displayed instead. If the proxy script does not have rights to
write on the web server you can host the proxy on a local
server such as WampServer (Windows) and generate the key files
there. After this, you can simply upload the files to your web
server and try the command again.

Make sure the config.php file has the correct path to the key
files.

The MNC_PROXY_USE_SESSION setting can also be set in the config
file. The first design for the proxy was to use session
variables for the web admin authentication values. It would
seem, however, that some web servers do not clean up session
variables properly and will generate errors after some time.
The fallback in this design is to retrieve the web admin
credentials from the database each request. It is up to the
proxy host to choose which method is to be used. If the
MNC_PROXY_USE_SESSION setting is set to TRUE, then session
variables will be used. If set to FALSE then database queries
will be made for the credentials each request.

################################################################

7 - FAQ

################################################################

 * Why does it say "Waiting In Lobby" when match has already
   started?

   The game server frequently spams server tags. These tags
   denote, among other things, the current map the server
   uses. The php proxy uses the steam condenser to read out
   these tags. Sometimes when a new map is loaded, it takes the
   server a while before it starts spamming the server tags.
   This delay is why sometimes the web admin tool will say
   "Waiting In Lobby" when a match round has already started.
   Just wait a minute and the status will be updated.

 * Why is the character class Assault by default?

   The character class icons are based upon an integer value
   retrieved from the game server. The default value is '0'.
   This value is also used for the assault class icon. So if a
   user has not yet chosen their class, the default value will
   cause the web admin tool to display the assault class icon
   next to the name. Just wait until the player has chosen
   their class and the icon will be updated.

 * Why can’t can't I send messages in chatlog?

   The game server does not seem to be able to handle all web
   admin requests all the time. If a request is made at the
   wrong time, the server will become unresponsive.
   Therefore, most of the web admin requests (including the
   chat send command) are only available and handled when
   a match round is in progress as this is the only stage
   where web admin requests can be made safely.

 * Why does the Ban list keep displaying an unbanned player id?

   When a player is banned, their ID is added to the
   HostileAccess.ini file of the dedicated server. When a
   player is unbanned, one would assume their ID would be
   removed from this file. However, this is not the case.
   Because the player ID is still present in the
   HostileAccess.ini file, their ID will keep ending up
   in the ban list request. You can manually remove player
   IDs from the .ini file if you wish to properly unban a
   player.

 * Why are there no players in player listing?

   The game server does not seem to be able to handle all web
   admin requests all the time. If a request is made at the
   wrong time, the server will become unresponsive.
   Therefore, most of the web admin requests (including the
   player list command) are only available and handled when
   a match round is in progress as this is the only stage
   where web admin requests can be made safely.

 * Why can’t I log in after I changed my user/pass for web
   access?

   Currently, there is no graceful way to handle this. To
   set up a new connection you will have to remove the
   cookies related to the web admin tool. Once these cookies
   are gone, you can redo the connection setup steps.

 * Why does it say that the proxy is offline?

   First you can check the status of your proxy by calling the
   following command:

   /proxy.php?request=online&callback=foo

   The result should look as follows:

   foo({"Online": "True"})

   If this does not appear then either the proxy is not set
   up properly or the web host is indeed down. Another issue
   can be that the server host does not handle session
   variables properly. You can set the MNC_PROXY_USE_SESSION
   option to FALSE and see if that makes any difference.

 * Why does the server status go back and forth between
   "Server Offline" and “Server Online?”

   It can be that the server host does not handle session
   variables properly. You can set the MNC_PROXY_USE_SESSION
   option to FALSE and see if that makes any difference.

 * It says "local cookies not supported" - what does this mean?

   This error message can appear if you run the web admin tool
   from a local drive. Currently, only Google Chrome causes this
   issue as it is the only web browser to date that does not
   allow cookies from a local site.
   The solution to this issue is either use a different browser
   or close down all Google Chrome windows and relaunch the
   browser with the following command added to the executable:

   chrome.exe --enable-file-cookies

 * Why do some letters appear lower case in chat log?

   The game server parses the chat log lines into a JSON format.
   Strings can be reformatted during this process. One of the
   things that happens is that some letters are escaped by
   default. For instance, every letter 'T' receives a backslash
   if it is parsed. Capital letters will become regular letters
   this way. There is currently no solution for this issue, as
   it is the game server itself that does this.

 * My question is not in this list?

   This is very probable. Please email your question to the
   following email address to get an answer:

   mnc-admin [at] detiege [dot] nl

   Frequently Asked Questions will be added to this list in the
   future.