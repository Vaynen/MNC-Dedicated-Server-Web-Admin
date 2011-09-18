<?php
/**
 * This code is free software; you can redistribute it and/or modify it under
 * the terms of the new BSD License.
 *
 * Copyright (c) 2008-2011, Sebastian Staudt
 *
 * @license http://www.opensource.org/licenses/bsd-license.php New BSD License
 */

require_once STEAM_CONDENSER_PATH . 'exceptions/RCONNoAuthException.php';
require_once STEAM_CONDENSER_PATH . 'steam/packets/rcon/RCONAuthRequest.php';
require_once STEAM_CONDENSER_PATH . 'steam/packets/rcon/RCONAuthResponse.php';
require_once STEAM_CONDENSER_PATH . 'steam/packets/rcon/RCONExecRequest.php';
require_once STEAM_CONDENSER_PATH . 'steam/packets/rcon/RCONTerminator.php';
require_once STEAM_CONDENSER_PATH . 'steam/servers/GameServer.php';
require_once STEAM_CONDENSER_PATH . 'steam/servers/MasterServer.php';
require_once STEAM_CONDENSER_PATH . 'steam/sockets/RCONSocket.php';
require_once STEAM_CONDENSER_PATH . 'steam/sockets/SourceSocket.php';

/**
 * This class represents a Source game server and can be used to query
 * information about and remotely execute commands via RCON on the server
 *
 * A Source game server is an instance of the Source Dedicated Server (SrcDS)
 * running games using Valve's Source engine, like Counter-Strike: Source,
 * Team Fortress 2 or Left4Dead.
 *
 * @author     Sebastian Staudt
 * @package    steam-condenser
 * @subpackage servers
 * @see        GoldSrcServer
 */
class SourceServer extends GameServer {

    /**
     * @var long The request ID used for RCON request
     */
    private $rconRequestId;

    /**
     * Returns a master server instance for the default master server for
     * Source games
     *
     * @return The Source master server
     */
    public function getMaster() {
        return new MasterServer(MasterServer::SOURCE_MASTER_SERVER);
    }

    /**
     * Initializes the sockets to communicate with the Source server
     *
     * @see RCONSocket
     * @see SourceSocket
     */
    public function initSocket() {
        $this->rconSocket = new RCONSocket($this->ipAddress, $this->port);
        $this->socket = new SourceSocket($this->ipAddress, $this->port);
    }

    /**
     * Authenticates the connection for RCON communication with the server
     *
     * @param string $password The RCON password of the server
     * @return whether authentication was successful
     * @see rconExec()
     * @throws SteamCondenserException if a problem occurs while parsing the
     *         reply
     * @throws TimeoutException if the request times out
     */
    public function rconAuth($password) {
        $this->rconRequestId = rand(0, pow(2, 16));

        $this->rconSocket->send(new RCONAuthRequest($this->rconRequestId, $password));
        $this->rconSocket->getReply();
        $reply = $this->rconSocket->getReply();
        $this->rconAuthenticated = $reply->getRequestId() == $this->rconRequestId;

        return $this->rconAuthenticated;
    }

    /**
     * Remotely executes a command on the server via RCON
     *
     * @param string $command The command to execute on the server via RCON
     * @return string The output of the executed command
     * @see rconAuth()
     * @throws RCONNoAuthException if not authenticated with the server
     * @throws SteamCondenserException if a problem occurs while parsing the
     *         reply
     * @throws TimeoutException if the request times out
     */
    public function rconExec($command) {
        if(!$this->rconAuthenticated) {
            throw new RCONNoAuthException();
        }

        $this->rconSocket->send(new RCONExecRequest($this->rconRequestId, $command));
        $this->rconSocket->send(new RCONTerminator($this->rconRequestId));

        $response = '';
        do {
            $responsePacket = $this->rconSocket->getReply();

            if($responsePacket instanceof RCONAuthResponse) {
                $this->rconAuthenticated = false;
                throw new RCONNoAuthException();
            }

            $response .= $responsePacket->getResponse();
        } while(strlen($response) == 0 || strlen($responsePacket->getResponse()) > 0);

        return trim($response);
    }
}
?>
