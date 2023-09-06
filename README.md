<h1 align="center">
  <a href="https://tf2pickup.pl">
    <img src="https://tf2pickup.pl/assets/favicon.png" alt="tf2pickup.org logo" width="128" height="128">
  </a>
</h1>

<h3 align="center">The tf2pickup.org server</h3>

<p align="center">
  <a href="https://github.com/tf2pickup-org/server/releases">
    <img src="https://img.shields.io/github/v/release/tf2pickup-org/server" alt="Latest release">
  </a>

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

<p align="center">
  <a href="https://docs.tf2pickup.org/"><strong>Documentation »</strong></a>
</p>

## About the project

tf2pickup.org was created with a simple objective in mind. Make it as easy and accessible for twelve players to play a 6v6 pick-up game in Team Fortress 2 as possible.


## Local deployment

### Setup

* Clone the repository or download a zipped release of your choice
* Open the terminal inside the repository folder
* Install the dependencies

    ```bash
    $ yarn install
    ```

* Copy and rename `sample.env` to `.env` and adjust your environment values, mainly:
  * `STEAM_API_KEY` - your [Steam API key](https://steamcommunity.com/dev/apikey), the "Domain Name" can be set to anything you like.
  * `SUPER_USER` - your SteamID64,
  * `LOG_RELAY_ADDRESS` - your IP address in the local network.

### Deployment

* Start the required services

    ```bash
    $ docker-compose up -d
    ```
* Finally, run the server in development mode

    ```bash
    $ yarn dev
    ```

  By default, the server is listening on port 3000 .


## Using Docker

There is a [Docker image](https://hub.docker.com/r/tf2pickuppl/server) available for you to run the production version of the application.


## Contact

* Discord: @niewielki
* Steam: <http://steamcommunity.com/id/nieduzy/>
