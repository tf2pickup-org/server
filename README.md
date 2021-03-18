<h1 align="center">
  <a href="https://tf2pickup.pl">
    <img src="https://tf2pickup.pl/assets/favicon.png" alt="tf2pickup.pl logo" width="200" height="200">
  </a>
</h1>

<h2 align="center">tf2pickup.org</h2>

<p align="center">
  <a href="https://github.com/tf2pickup-org/server/actions?query=workflow%3Atest">
    <img src="https://github.com/tf2pickup-org/server/workflows/test/badge.svg" alt="Test status">
  </a>

  <a href="https://codecov.io/gh/tf2pickup-org/server">
    <img src="https://codecov.io/gh/tf2pickup-org/server/branch/master/graph/badge.svg" alt="Code coverage">
  </a>

  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT license">
  </a>

  <a href="https://w.supra.tf/b/xYYTewYR5RcvfHBZ8/tf2pickup-pl">
    <img src="https://img.shields.io/badge/project-wekan-%2300aecc.svg" alt="Wekan">
  </a>
</p>

<h3 align="center">The tf2pickup.org server</h3>

## About the project

tf2pickup.org was created with a simple objective in mind. Make it as easy and accessible for twelve players to play a 6v6 pick-up game in Team Fortress 2 as possible. 

## Prerequisites

* a MongoDB database
* Steam API key
* one open UDP port for TF2 game server log relay
* a Mumble server
* *optionally* a Discord server
* *optionally* twitch.tv client id & secret

## Setup

* clone the repository or download a zipped release of your choice
* copy `sample.env` to `.env` and adjust your environment values
* review configuration files in `configs/`
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
* <http://steamcommunity.com/id/nieduzy/>
