<?php

/* for each web admin call a username and password is required
 * these can be stored as session variables and used each time a request is made
 * set MNC_PROXY_USE_SESSION to TRUE if you wish to use this
 *
 * since not all PHP hosts properly support session variables (garbage collection issues)
 * there is also the option to use database queries to retrieve the values each server request
 * set MNC_PROXY_USE_SESSION to FALSE if you wish to use this
 *
 * info about PHP 5 session issues on Debian/Ubuntu servers:
 *
 * http://forum.kohanaframework.org/discussion/565/garbage-collector-error-with-sessions-on-debian/p1
 * http://somethingemporium.com/2007/06/obscure-error-with-php5-on-debian-ubuntu-session-phpini-garbage
 */

define("MNC_PROXY_USE_SESSION", FALSE);

$db_address   = "";                /* ip address of the database server                                 */
$db_name      = "";                /* name of the database on the server                                */
$db_login     = "";                /* login required to log onto the server                             */
$db_password  = "";                /* password required to log onto the server                          */

$db_table     = "tbl_mnc_proxy";   /* table in the database used for the proxy                          */

$path_private = "";                /* filepath for private key (e.g. "./../../openssl/mnc-private.key") */
$path_public  = "";                /* filepath for public key  (e.g. "./../../openssl/mnc-public.key")  */

?>