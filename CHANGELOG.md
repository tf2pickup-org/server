# [2.7.0](https://github.com/garrappachc/server/compare/2.6.3...2.7.0) (2020-06-10)


### Bug Fixes

* ignore match start after it has been ended ([#422](https://github.com/garrappachc/server/issues/422)) ([b6e2958](https://github.com/garrappachc/server/commit/b6e29580ace014a223867842521bbaa1c304313d))
* **deps:** update dependency nestjs-console to v3.0.6 ([#420](https://github.com/garrappachc/server/issues/420)) ([147fcbd](https://github.com/garrappachc/server/commit/147fcbd6c3ffe8028939163bd3c214f67c29e4be))


### Features

* **ci:** add release-it support ([aafcdfb](https://github.com/garrappachc/server/commit/aafcdfb50c0d56c21e532d25c991fedf0a591185))

# [2.6.3](https://github.com/tf2pickup-pl/server/compare/2.6.2...2.6.3) (2020-06-10)

### Fixes
* Game event synchronization ([a8473ea](https://github.com/tf2pickup-pl/server/commit/a8473eae4032a2e607af50bd66b4907e791dc3ec))
* Update 6v6 config ([01f66d7](https://github.com/tf2pickup-pl/server/commit/01f66d7765f8764d3f2ec15b798ca4d9c6acb6a5))
* Update 9v9 config ([cdd8afc](https://github.com/tf2pickup-pl/server/commit/cdd8afc49c2b31a457eece04ec3e111fbab58148))

# [2.6.2](https://github.com/tf2pickup-pl/server/compare/2.6.1...2.6.2) (2020-05-25)

### Fixes
* Get rid of empty skill change notifications ([4d7447b](https://github.com/tf2pickup-pl/server/commit/4d7447bfe6b4cc584a82e14e0a478053344989ce))
* Remove TwitchGateway namespace ([80d7e11](https://github.com/tf2pickup-pl/server/commit/80d7e1143b5d0fb7f86f37655d503fa6130b564f))

# [2.6.1](https://github.com/tf2pickup-pl/server/compare/2.6.0...2.6.1) (2020-05-17)

### Fixes
* Disable streams for players with active bans only ([31db9bb](https://github.com/tf2pickup-pl/server/commit/31db9bb3bb055cdc126bbb8aa1c154e3e9393974))

# [2.6.0](https://github.com/tf2pickup-pl/server/compare/2.5.1...2.6.0) (2020-05-16)

### Features
* twitch.tv integration ([be73490](https://github.com/tf2pickup-pl/server/commit/be73490c2b50b65f7b1fc9db18e88260f40c669a))
* Configurable map cooldown ([83521e7](https://github.com/tf2pickup-pl/server/commit/83521e746abff8e667422af311ef552322762b4a))
* Add database indexes ([da74427](https://github.com/tf2pickup-pl/server/commit/da744272ad17b167f022dae2f047b7024763d1ea))
* Notify admins on name change ([b76a0b8](https://github.com/tf2pickup-pl/server/commit/b76a0b872791d9c7bacf38fcd78b1f078aa118e9))
* Notify admins on skill change ([f1d043e](https://github.com/tf2pickup-pl/server/commit/f1d043eed78ff984c9e8f5d164434bafa39231c0))

### Refactor
* DiscordModule ([bfe35e7](https://github.com/tf2pickup-pl/server/commit/bfe35e7877e82c7ea22138a50539fa6d005a053a))

# [2.5.1](https://github.com/tf2pickup-pl/server/compare/2.5.0...2.5.1) (2020-05-02)

### Fixes
* Handle semicolons in csv files on skill import ([215cb4e](https://github.com/tf2pickup-pl/server/commit/215cb4e91ec8f86ddbe89902c07ee05532087f03))
* Use class name as skill map key ([9eb85ad](https://github.com/tf2pickup-pl/server/commit/9eb85ad2b560680d9d92121ed182172450705bfb))

# [2.5.0](https://github.com/tf2pickup-pl/server/compare/2.4.1...2.5.0) (2020-05-02)

### Features
* Export player skills ([cf0507f](https://github.com/tf2pickup-pl/server/commit/cf0507f64ba39ed0cd3e0cb31ddf524d421727a6))
* Import player skills ([828810a](https://github.com/tf2pickup-pl/server/commit/828810a9f2dfcc5b52951a022b41a7683cf3c718))

# [2.4.1](https://github.com/tf2pickup-pl/server/compare/2.4.0...2.4.1) (2020-04-23)

### Fixes
* Handle missing execConfigs option ([836bcfd](https://github.com/tf2pickup-pl/server/commit/836bcfdb8998d1e4a8750d6b385b2fc40c42e38d))

# [2.4.0](https://github.com/tf2pickup-pl/server/compare/2.3.0...2.4.0) (2020-04-22)

### Features
* Serve documents ([4ca1286](https://github.com/tf2pickup-pl/server/commit/4ca12861ee8f84e354d4b6fddac00b0c6d58df31))
* 9v9 gamemode support ([91e73d3](https://github.com/tf2pickup-pl/server/commit/91e73d349f27bd7b8cf48ce33d9096588e057277))
* Per-map game config ([5186325](https://github.com/tf2pickup-pl/server/commit/518632589f18a7dd5b8abec78db70fce5d51a461))
* Add ETF2L season 36 preseason cup maps ([4acc1f3](https://github.com/tf2pickup-pl/server/commit/4acc1f38bcac18220cccf5ad3689b8f859bcffc4))

### Fixes
* Handle Steam API error code 500 ([e5a2f8e](https://github.com/tf2pickup-pl/server/commit/e5a2f8ece482ecd2e1a9b9a6d69da097ff233d3b))

# [2.3.0](https://github.com/tf2pickup-pl/server/compare/2.2.0...2.3.0) (2020-03-04)

### Features
* Verify TF2 in-game hours ([18a57a3](https://github.com/tf2pickup-pl/server/commit/18a57a36aa9a3aa74b5073e080f37fbfc34cb316))

# [2.2.0](https://github.com/tf2pickup-pl/server/compare/2.1.0...2.2.0) (2020-03-03)

### Features
* Whitelist support ([0b1280c](https://github.com/tf2pickup-pl/server/commit/0b1280cb92e9f92d66393f8db19f53a40f664914))

# [2.1.0](https://github.com/tf2pickup-pl/server/compare/2.0.2...2.1.0) (2020-02-26)

### Features
* Announce player substitutes in-game ([8f1c154](https://github.com/tf2pickup-pl/server/commit/8f1c15417b67fe8b0e0e8892f382eff1aa11fb3d))

### Fixes
* Downgrade cp_reckoner to version rc2 ([d175651](https://github.com/tf2pickup-pl/server/commit/d175651c6f8d70c326284ad94d24a272b83189ee))
* Cleanup verbose logs ([b27d977](https://github.com/tf2pickup-pl/server/commit/b27d9778e18edf02a3d97104fe1bafb0b77fef3f))
* Fix PlayerBansService test ([a47359f](https://github.com/tf2pickup-pl/server/commit/a47359f4da5f40f3cdda0e6dfa54e9614e87cea9))
* Don't restart ended matches ([9256168](https://github.com/tf2pickup-pl/server/commit/92561685d701bc5aae55ed7f7418049b72e0b683))

# [2.0.2](https://github.com/tf2pickup-pl/server/compare/2.0.1...2.0.2) (2020-02-16)

### Fixes
* Kick the replacement player from the queue ([77e858e](https://github.com/tf2pickup-pl/server/commit/77e858e93c4e1ce01b6aa0ce0497652b63f5e2e9))

# [2.0.1](https://github.com/tf2pickup-pl/server/compare/2.0.0...2.0.1) (2020-02-14)

### Fixes
* Handle demoting players ([2b2d01d](https://github.com/tf2pickup-pl/server/commit/2b2d01dc57c4a8a8c8c9e245f0fd19acf353b3a6))

# [2.0.0](https://github.com/tf2pickup-pl/server/compare/1.1.2...2.0.0) (2020-02-14)

### Features
* Player substitutes ([69ec724](https://github.com/tf2pickup-pl/server/commit/69ec724c1ed163226cc2f6998180abcdcbbf5d41))
* Refined friends sytem ([fa8ad5b](https://github.com/tf2pickup-pl/server/commit/fa8ad5b994a7d2b3ef3f2b33160e42da184303fd))
* Player connection status ([f6f613a](https://github.com/tf2pickup-pl/server/commit/f6f613a3e79d8adc5f57f8e7b40c17dd92cba71d))
* Remove expired refresh tokens ([b534922](https://github.com/tf2pickup-pl/server/commit/b534922f214efe0d598fee9806e1b9330a3d2f28))
* Update player role via the  API ([b286a1b](https://github.com/tf2pickup-pl/server/commit/b286a1bdc192a6fbe25be9c54486fc0ee5f61513))
* Discord notifiation upon ban revoke ([dcbdf1c](https://github.com/tf2pickup-pl/server/commit/dcbdf1c7c2477c81187b8f41b3889fcf9716dd56))
* Deburr player names before setting them up on the game server ([8ca2e4d](https://github.com/tf2pickup-pl/server/commit/8ca2e4dd80bbeddd88034423ae1f1446d8124974))
* Match score reporting ([1d891b2](https://github.com/tf2pickup-pl/server/commit/1d891b22308d25773afd0425c65d31d5a9284a9c))
* Provide STV connect string ([8de4a34](https://github.com/tf2pickup-pl/server/commit/8de4a347eaf278f93316df4a3cf467004a30f74c))
* Launch orphaned games ([434d702](https://github.com/tf2pickup-pl/server/commit/434d702672e036ecd13547452737453909c7d7ea))

### Fixes
* Deny registering profiles with active ETF2L bans ([be79d20](https://github.com/tf2pickup-pl/server/commit/be79d207a3ff1d6ce723fca5f204d9d7fa85323b))

# [1.1.2](https://github.com/tf2pickup-pl/server/compare/1.1.1...1.1.2) (2020-01-05)

### Fixes
* one medic's friend pick was not taken into account ([b850c9d](https://github.com/tf2pickup-pl/server/commit/b850c9d3cb6320b415a408a25a09168007e1f680))

# [1.1.1](https://github.com/tf2pickup-pl/server/compare/1.1.0...1.1.1) (2019-12-30)

### Fixes
* profile creation ([64346a1](https://github.com/tf2pickup-pl/server/commit/64346a1a376963077d0580c2247b7b79836ded17))
* handle uninitialized skill  ([640e9e2](https://github.com/tf2pickup-pl/server/commit/640e9e2b8a6b13c1ba27c5e4eca94d1767ad6cfc))

# [1.1.0](https://github.com/tf2pickup-pl/server/compare/1.0.4...1.1.0) (2019-12-29)

### Features
* get all players' skills ([f1548ea](https://github.com/tf2pickup-pl/server/commit/f1548ea1b8b4d23eab4c68af57fec8c735b8e436))

### Fixes
* queue fixes ([58506f1](https://github.com/tf2pickup-pl/server/commit/58506f1e6463814ae0576d1b3020c3110615ce23))

# [1.0.4](https://github.com/tf2pickup-pl/server/compare/1.0.3...1.0.4) (2019-12-28)

### Fixes
* queue ready up hotfix

# [1.0.3](https://github.com/tf2pickup-pl/server/compare/1.0.2...1.0.3) (2019-12-28)

### Fixes
* queue ready up behavior
* find server by log event source

# [1.0.2](https://github.com/tf2pickup-pl/server/compare/1.0.1...1.0.2) (2019-12-28)

### Fixes
* fix 6v6.json config

# [1.0.1](https://github.com/tf2pickup-pl/server/compare/1.0.0...1.0.1) (2019-12-28)

### Fixes
* handle player friends

# [1.0.0](https://github.com/tf2pickup-pl/server/releases/tag/1.0.0) (2019-12-28)

* Initial release
* Supports all features of the old `server-legacy` project
