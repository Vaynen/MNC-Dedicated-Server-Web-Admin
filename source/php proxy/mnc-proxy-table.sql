CREATE TABLE IF NOT EXISTS `tbl_mnc_proxy` (
  `client_id` int(11) NOT NULL AUTO_INCREMENT,
  `client_ip` varchar(256) NOT NULL,
  `client_server_ip` varchar(256) NOT NULL,
  `client_game_port` int(11) NOT NULL,
  `client_web_port` varchar(256) NOT NULL,
  `client_username` varchar(256) NOT NULL,
  `client_password` varchar(256) NOT NULL,
  `client_key` varchar(256) NOT NULL,
  PRIMARY KEY (`client_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 ;