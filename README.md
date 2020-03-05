# tf2pickup.pl server [![Build Status](https://api.travis-ci.com/tf2pickup-pl/server.svg?branch=master)](https://travis-ci.com/tf2pickup-pl/server) [![Code coverage](https://codecov.io/gh/tf2pickup-pl/server/branch/master/graph/badge.svg)](https://codecov.io/gh/tf2pickup-pl/server) [![MIT license](https://img.shields.io/github/license/tf2pickup-pl/server)](https://github.com/tf2pickup-pl/server/blob/master/LICENSE) [![ZenHub](https://img.shields.io/badge/project-ZenHub-5e60ba.svg)](https://app.zenhub.com/workspaces/tf2pickuppl-5e5f84c8ae570de02377ca32/board)

## Prerequisites

* a MongoDB database
* Steam API key
* one open UDP port for TF2 game server log relay
* a Mumble server
* *optionally* a Discord server

## Setup

* clone the repository or download a zipped release of your choice
* copy `sample.env` to `.env` and adjust your environment values
* review configuration in `configs/config.ts`
* install dependencies
    ```bash
    npm i
    ```
* build the project
    ```bash
    npm run build
    ```

## Running

To launch the server application itself, you have a couple options:

* launch the process in the shell manually
    ```bash
    node dist/src/main.js
    ```
    Note that you will probably want to run the process in a separate shell, i.e. tmux.

* use process manager, i.e. `pm2`
    ```bash
    npm i -g pm2
    pm2 start dist/src/main.js
    ```
    
The server process listens for incoming connections on port 3000.

## Contact

* mały#0226
* http://steamcommunity.com/id/nieduzy/
