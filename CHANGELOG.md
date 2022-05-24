

# [9.0.0-beta.9](https://github.com/tf2pickup-org/server/compare/9.0.0-beta.8...9.0.0-beta.9) (2022-05-24)


### Bug Fixes

* **deps:** update dependency discord.js to v13 ([#1145](https://github.com/tf2pickup-org/server/issues/1145)) ([322cd4e](https://github.com/tf2pickup-org/server/commit/322cd4e608aec2ce5901fa4f028df98b080aa801))
* **games:** better gameChanges event ([#1665](https://github.com/tf2pickup-org/server/issues/1665)) ([42cd44d](https://github.com/tf2pickup-org/server/commit/42cd44db26b190122134ad6fc6ca630e907ddda1))
* **voice-servers:** gracefully handle connection errors ([#1664](https://github.com/tf2pickup-org/server/issues/1664)) ([018902b](https://github.com/tf2pickup-org/server/commit/018902bb1c2abe5ae930c46ac84fbf8b26768279))


### Features

* drop support for Node.JS 14 ([#1661](https://github.com/tf2pickup-org/server/issues/1661)) ([0a26916](https://github.com/tf2pickup-org/server/commit/0a269160ebfc27ddef59539cba62b778a8534ab9))


### BREAKING CHANGES

* Support for Node.JS v14 has been removed

# [9.0.0-beta.8](https://github.com/tf2pickup-pl/server/compare/9.0.0-beta.7...9.0.0-beta.8) (2022-05-23)


### Bug Fixes

* **configuration:** add configuration change event ([#1659](https://github.com/tf2pickup-pl/server/issues/1659)) ([d009ad1](https://github.com/tf2pickup-pl/server/commit/d009ad194662250cc3f1026d8c0a056949d9fcb5))
* **deps:** update dependency @tf2pickup-org/simple-mumble-bot to v0.3.4 ([#1658](https://github.com/tf2pickup-pl/server/issues/1658)) ([f672e34](https://github.com/tf2pickup-pl/server/commit/f672e34ee9d1c5e0c978ee81282d6a74065c75af))
* **queue:** atomic join queue ([#1656](https://github.com/tf2pickup-pl/server/issues/1656)) ([3e7d361](https://github.com/tf2pickup-pl/server/commit/3e7d361696159125c5270db96c9defeff8ae3924))
* **voice-servers:** handle mumble bot errors gracefully ([#1657](https://github.com/tf2pickup-pl/server/issues/1657)) ([ce652cb](https://github.com/tf2pickup-pl/server/commit/ce652cb97e1e9dd7a8da408dea7331b2f8e91d6e))

# [9.0.0-beta.7](https://github.com/tf2pickup-pl/server/compare/9.0.0-beta.6...9.0.0-beta.7) (2022-05-21)


### Bug Fixes

* **deps:** update dependency @nestjs/mongoose to v9.1.0 ([#1650](https://github.com/tf2pickup-pl/server/issues/1650)) ([883255c](https://github.com/tf2pickup-pl/server/commit/883255cd292d9435e5694cb11fbf343b43e2aee3))
* **deps:** update dependency @nestjs/schedule to v2 ([#1649](https://github.com/tf2pickup-pl/server/issues/1649)) ([a16ef01](https://github.com/tf2pickup-pl/server/commit/a16ef013c2e0f177f3d6b79228e3c38150a5555f))
* **deps:** update dependency cache-manager to v3.6.3 ([#1652](https://github.com/tf2pickup-pl/server/issues/1652)) ([3f6ab9b](https://github.com/tf2pickup-pl/server/commit/3f6ab9b6aefd2b6eff850e0ec72f7aaf5596280d))
* **deps:** update dependency passport to v0.6.0 ([#1651](https://github.com/tf2pickup-pl/server/issues/1651)) ([9da593b](https://github.com/tf2pickup-pl/server/commit/9da593b69aa41d9284aa8e21ca1737a053999ed0))
* **games:** don't crash on missing logsecret ([#1655](https://github.com/tf2pickup-pl/server/issues/1655)) ([d510edf](https://github.com/tf2pickup-pl/server/commit/d510edf6b09e859c7764a798f28ad91962732c8f))

# [9.0.0-beta.6](https://github.com/tf2pickup-org/server/compare/9.0.0-beta.5...9.0.0-beta.6) (2022-05-20)


### Bug Fixes

* **deps:** update dependency @tf2pickup-org/simple-mumble-bot to v0.3.3 ([#1648](https://github.com/tf2pickup-org/server/issues/1648)) ([b3cfc04](https://github.com/tf2pickup-org/server/commit/b3cfc043e6b01254e7798cd034f7ad0123087b82))
* **voice-servers:** MumbleBotService better logging ([#1647](https://github.com/tf2pickup-org/server/issues/1647)) ([c476847](https://github.com/tf2pickup-org/server/commit/c476847085cdae16da6cd19f6c939e6bcbb2d9bf))

# [9.0.0-beta.5](https://github.com/tf2pickup-org/server/compare/9.0.0-beta.4...9.0.0-beta.5) (2022-05-19)


### Bug Fixes

* **deps:** update dependency @tf2pickup-org/simple-mumble-bot to v0.3.2 ([#1644](https://github.com/tf2pickup-org/server/issues/1644)) ([a408bda](https://github.com/tf2pickup-org/server/commit/a408bda775f15ae68e79173234e3a96fa9e4d900))
* **deps:** update dependency cache-manager to v3.6.2 ([#1646](https://github.com/tf2pickup-org/server/issues/1646)) ([f53faba](https://github.com/tf2pickup-org/server/commit/f53faba6ac3f35d149d349e754d99962be93d9bf))
* **deps:** update dependency mongoose to v6.3.4 ([#1645](https://github.com/tf2pickup-org/server/issues/1645)) ([3bd6d46](https://github.com/tf2pickup-org/server/commit/3bd6d46f95c579cc58cfef21b79a8991fd380914))

# [9.0.0-beta.4](https://github.com/tf2pickup-org/server/compare/9.0.0-beta.3...9.0.0-beta.4) (2022-05-19)


### Bug Fixes

* **deps:** update dependency @nestjs/axios to v0.0.8 ([#1640](https://github.com/tf2pickup-org/server/issues/1640)) ([fb12ab8](https://github.com/tf2pickup-org/server/commit/fb12ab859db66e40a69ddaaa50c90d3fdb81bd31))
* **deps:** update dependency @nestjs/config to v2.0.1 ([#1637](https://github.com/tf2pickup-org/server/issues/1637)) ([0297319](https://github.com/tf2pickup-org/server/commit/0297319f705e824158d8a125bdd4c943d5787270))
* **voice-servers:** self-deafen mumble bot ([#1643](https://github.com/tf2pickup-org/server/issues/1643)) ([307da53](https://github.com/tf2pickup-org/server/commit/307da537ed192635533a406e4de65c69ab5d7ef0))


### Features

* **voice-servers:** link mumble channels when the game ends ([#1642](https://github.com/tf2pickup-org/server/issues/1642)) ([6f4eb45](https://github.com/tf2pickup-org/server/commit/6f4eb451a418d5344f966a7a8b6512f41401a4bd))

# [9.0.0-beta.3](https://github.com/tf2pickup-org/server/compare/9.0.0-beta.2...9.0.0-beta.3) (2022-05-18)


### Bug Fixes

* **deps:** update dependency @tf2pickup-org/simple-mumble-bot to v0.3.1 ([#1638](https://github.com/tf2pickup-org/server/issues/1638)) ([0b9823d](https://github.com/tf2pickup-org/server/commit/0b9823dcbecdb908e3f16511f92993a52077e10c))

# [9.0.0-beta.2](https://github.com/tf2pickup-org/server/compare/9.0.0-beta.1...9.0.0-beta.2) (2022-05-17)


### Bug Fixes

* **build:** don't build e2e and jest.config ([#1625](https://github.com/tf2pickup-org/server/issues/1625)) ([a60da2a](https://github.com/tf2pickup-org/server/commit/a60da2a6b10a894831921691cfb3aa353fcbc889))
* **build:** fix JavaScript heap out of memory ([#1629](https://github.com/tf2pickup-org/server/issues/1629)) ([99d47ab](https://github.com/tf2pickup-org/server/commit/99d47abaa0f2e30c346228c6f72b24a5a9f9e920))
* **deps:** update dependency @tf2pickup-org/simple-mumble-bot to v0.2.1 ([#1627](https://github.com/tf2pickup-org/server/issues/1627)) ([129a532](https://github.com/tf2pickup-org/server/commit/129a53219c3176e760a22f4d30341b4131e299c7))
* **deps:** update dependency @tf2pickup-org/simple-mumble-bot to v0.3.0 ([#1632](https://github.com/tf2pickup-org/server/issues/1632)) ([4494ffc](https://github.com/tf2pickup-org/server/commit/4494ffca564a8ea6ec80b4aa64f60ab01a5bcdf3))
* **deps:** update dependency helmet to v5.1.0 ([#1635](https://github.com/tf2pickup-org/server/issues/1635)) ([331ab95](https://github.com/tf2pickup-org/server/commit/331ab9518d31ef7a513964c5089e36bf86275bd3))
* **deps:** update dependency jsonschema to v1.4.1 ([#1633](https://github.com/tf2pickup-org/server/issues/1633)) ([a5a1b70](https://github.com/tf2pickup-org/server/commit/a5a1b709ad4ddec6573b79064cc5c4fb0b098dcb))
* **deps:** update dependency mongodb to v4.6.0 ([#1617](https://github.com/tf2pickup-org/server/issues/1617)) ([b1e4390](https://github.com/tf2pickup-org/server/commit/b1e4390e66014e78d8c36f00247ba68b3978e74a))
* **deps:** update dependency mongoose to v6.3.3 ([#1614](https://github.com/tf2pickup-org/server/issues/1614)) ([9e1cac9](https://github.com/tf2pickup-org/server/commit/9e1cac9cf84e14182a5d8423a2331d7a2a2c4446))
* **deps:** update dependency passport to v0.5.3 ([#1626](https://github.com/tf2pickup-org/server/issues/1626)) ([6e26fdf](https://github.com/tf2pickup-org/server/commit/6e26fdfd46e93c2cd383fefb7a21290618c7c339))
* **deps:** update nest monorepo to v8.4.5 ([#1621](https://github.com/tf2pickup-org/server/issues/1621)) ([1b1be9e](https://github.com/tf2pickup-org/server/commit/1b1be9e4fb360aed930625fa3c8399b6f0a2d38b))
* **game-servers:** fix v9 database migration ([#1613](https://github.com/tf2pickup-org/server/issues/1613)) ([cbe886d](https://github.com/tf2pickup-org/server/commit/cbe886d3838d3a9985125af857668d17bed6d6d9))
* **game-servers:** get rid of GameServer.voiceChannelName() ([#1631](https://github.com/tf2pickup-org/server/issues/1631)) ([5cb7c72](https://github.com/tf2pickup-org/server/commit/5cb7c72d5c0f5b443c889c706de598cfd3b22f1c))


### Features

* mumble bot ([#1602](https://github.com/tf2pickup-org/server/issues/1602)) ([a6bcf49](https://github.com/tf2pickup-org/server/commit/a6bcf49f382baacab543a174d7a01f4a38deede6))

# [9.0.0-beta.1](https://github.com/tf2pickup-org/server/compare/9.0.0-beta.0...9.0.0-beta.1) (2022-05-08)


### Bug Fixes

* **players:** bring back the ability to revoke player's ban ([#1612](https://github.com/tf2pickup-org/server/issues/1612)) ([bd4a1a0](https://github.com/tf2pickup-org/server/commit/bd4a1a0d0b77d818b7af3573907b15e47b7cd978))


### Features

* add ultiduo config ([#1610](https://github.com/tf2pickup-org/server/issues/1610)) ([c09da30](https://github.com/tf2pickup-org/server/commit/c09da304985491c01f7a4c9e88bfa407112cdff1))

# [9.0.0-beta.0](https://github.com/tf2pickup-org/server/compare/8.2.0...9.0.0-beta.0) (2022-05-05)


### Bug Fixes

* **build:** add stable, nightly and sha docker tags ([#1588](https://github.com/tf2pickup-org/server/issues/1588)) ([4b49419](https://github.com/tf2pickup-org/server/commit/4b49419dce16b4b99d1900d29b8ebe5633e52cf0))
* **build:** cleanup Node.JS versions ([#1455](https://github.com/tf2pickup-org/server/issues/1455)) ([27c87bf](https://github.com/tf2pickup-org/server/commit/27c87bf1beb7b2239c66c7db2a033c10959b1170))
* **build:** ignore mongo upgrades ([#1480](https://github.com/tf2pickup-org/server/issues/1480)) ([85fb249](https://github.com/tf2pickup-org/server/commit/85fb2495222d9fa78477751bf39cbc40c3afd6ff))
* **ci:** fix heap out of memory error ([#1596](https://github.com/tf2pickup-org/server/issues/1596)) ([6ad877f](https://github.com/tf2pickup-org/server/commit/6ad877f9750a05c3ff550028e1f88135ad58cefa))
* **deps:** update dependency @nestjs/axios to v0.0.4 ([#1414](https://github.com/tf2pickup-org/server/issues/1414)) ([304b948](https://github.com/tf2pickup-org/server/commit/304b9484406fd78daf407bc63d1ec665d0faff34))
* **deps:** update dependency @nestjs/axios to v0.0.5 ([#1445](https://github.com/tf2pickup-org/server/issues/1445)) ([f30f6fa](https://github.com/tf2pickup-org/server/commit/f30f6fab89483c36ce6ba787e39f0ec2d36ee5fe))
* **deps:** update dependency @nestjs/axios to v0.0.6 ([#1482](https://github.com/tf2pickup-org/server/issues/1482)) ([63930fc](https://github.com/tf2pickup-org/server/commit/63930fce5abfc4dc58ebbda109f42ad18373b858))
* **deps:** update dependency @nestjs/axios to v0.0.7 ([#1507](https://github.com/tf2pickup-org/server/issues/1507)) ([aa4d43a](https://github.com/tf2pickup-org/server/commit/aa4d43a7ade54c5485a0cd2d5ca1d934d833d37a))
* **deps:** update dependency @nestjs/config to v1.1.1 ([#1376](https://github.com/tf2pickup-org/server/issues/1376)) ([107b171](https://github.com/tf2pickup-org/server/commit/107b171f86ddd25ab92a046627e4bdc5535012d2))
* **deps:** update dependency @nestjs/config to v1.1.2 ([#1378](https://github.com/tf2pickup-org/server/issues/1378)) ([71d80bf](https://github.com/tf2pickup-org/server/commit/71d80bf9cd916638c5b96879ef98e8741f2266e5))
* **deps:** update dependency @nestjs/config to v1.1.3 ([#1381](https://github.com/tf2pickup-org/server/issues/1381)) ([08941df](https://github.com/tf2pickup-org/server/commit/08941df9365644795c8e1cf0260575d2512bb59f))
* **deps:** update dependency @nestjs/config to v1.1.5 ([#1384](https://github.com/tf2pickup-org/server/issues/1384)) ([3c63a1d](https://github.com/tf2pickup-org/server/commit/3c63a1d6448d94ffbb3f96cf3ad4b50bc9ad8014))
* **deps:** update dependency @nestjs/config to v1.1.6 ([#1415](https://github.com/tf2pickup-org/server/issues/1415)) ([a23e010](https://github.com/tf2pickup-org/server/commit/a23e0108036b712251a4ca18ee053c4a77b8f6ce))
* **deps:** update dependency @nestjs/config to v1.1.7 ([#1467](https://github.com/tf2pickup-org/server/issues/1467)) ([a325223](https://github.com/tf2pickup-org/server/commit/a3252230c26f589d26a1f2b5a7ba080fb9af2f8e))
* **deps:** update dependency @nestjs/config to v1.2.0 ([#1472](https://github.com/tf2pickup-org/server/issues/1472)) ([80595b2](https://github.com/tf2pickup-org/server/commit/80595b289810c83b0b4965db36735b6a88584dd6))
* **deps:** update dependency @nestjs/config to v1.2.1 ([#1524](https://github.com/tf2pickup-org/server/issues/1524)) ([8ccfbaf](https://github.com/tf2pickup-org/server/commit/8ccfbafcf1fdf40db023154a59f0769a5e6d2609))
* **deps:** update dependency @nestjs/config to v2 ([#1525](https://github.com/tf2pickup-org/server/issues/1525)) ([f400b13](https://github.com/tf2pickup-org/server/commit/f400b132c5598b645f5fdea58b0d3eb70a579791))
* **deps:** update dependency @nestjs/passport to v8.1.0 ([#1431](https://github.com/tf2pickup-org/server/issues/1431)) ([a377575](https://github.com/tf2pickup-org/server/commit/a3775759e6598fd4b954f2bbc458964e030751a5))
* **deps:** update dependency @nestjs/passport to v8.2.0 ([#1471](https://github.com/tf2pickup-org/server/issues/1471)) ([b36c9aa](https://github.com/tf2pickup-org/server/commit/b36c9aa5b32f37059257bdc8ed182634cc2e6bb5))
* **deps:** update dependency @nestjs/schedule to v1.0.2 ([#1365](https://github.com/tf2pickup-org/server/issues/1365)) ([5b729ae](https://github.com/tf2pickup-org/server/commit/5b729aeaf46c338caccf23d773b1529fbfcabd4d))
* **deps:** update dependency @nestjs/schedule to v1.1.0 ([#1542](https://github.com/tf2pickup-org/server/issues/1542)) ([14e5c25](https://github.com/tf2pickup-org/server/commit/14e5c253c65ac907d8613fc06321f26ce05576fb))
* **deps:** update dependency cache-manager to v3.5.0 ([#1358](https://github.com/tf2pickup-org/server/issues/1358)) ([a9ef8b0](https://github.com/tf2pickup-org/server/commit/a9ef8b082e0c6e40663859b0c5c3e1e557701e17))
* **deps:** update dependency cache-manager to v3.6.0 ([#1359](https://github.com/tf2pickup-org/server/issues/1359)) ([a900783](https://github.com/tf2pickup-org/server/commit/a9007838ae4f9493ad399a3ce87250243937d62e))
* **deps:** update dependency cache-manager to v3.6.1 ([#1557](https://github.com/tf2pickup-org/server/issues/1557)) ([7a2bdf0](https://github.com/tf2pickup-org/server/commit/7a2bdf0c2da607a5247a367750c3031abc5b9a30))
* **deps:** update dependency class-transformer to v0.5.1 ([#1374](https://github.com/tf2pickup-org/server/issues/1374)) ([0dc22d6](https://github.com/tf2pickup-org/server/commit/0dc22d60e288b4541837cb8e9f0cd144f8820353))
* **deps:** update dependency class-validator to v0.13.2 ([#1373](https://github.com/tf2pickup-org/server/issues/1373)) ([4e8d5d3](https://github.com/tf2pickup-org/server/commit/4e8d5d3527665251788025e9d5eeb43e718b29ea))
* **deps:** update dependency generate-password to v1.7.0 ([#1356](https://github.com/tf2pickup-org/server/issues/1356)) ([a2937a5](https://github.com/tf2pickup-org/server/commit/a2937a5de5da566daaf51df217cc476f0ff496f0))
* **deps:** update dependency helmet to v5 ([#1412](https://github.com/tf2pickup-org/server/issues/1412)) ([73aabe1](https://github.com/tf2pickup-org/server/commit/73aabe13728eb76fdaa234d2286460943ba3037c))
* **deps:** update dependency joi to v17.4.3 ([#1389](https://github.com/tf2pickup-org/server/issues/1389)) ([eebe533](https://github.com/tf2pickup-org/server/commit/eebe53398fdbb95316004bf79f279213355ec74f))
* **deps:** update dependency joi to v17.5.0 ([#1390](https://github.com/tf2pickup-org/server/issues/1390)) ([1cdb2f2](https://github.com/tf2pickup-org/server/commit/1cdb2f24e9e19d9cf5013ac4ee882ddd3260ec41))
* **deps:** update dependency joi to v17.6.0 ([#1449](https://github.com/tf2pickup-org/server/issues/1449)) ([838ef76](https://github.com/tf2pickup-org/server/commit/838ef762a2151c527694ec48d9cf54bfae7c167d))
* **deps:** update dependency migrate to v1.8.0 ([#1534](https://github.com/tf2pickup-org/server/issues/1534)) ([57787f8](https://github.com/tf2pickup-org/server/commit/57787f8f41fb42a294183e65f1ebfcd17cbb5894))
* **deps:** update dependency moment to v2.29.2 ([#1551](https://github.com/tf2pickup-org/server/issues/1551)) ([321defa](https://github.com/tf2pickup-org/server/commit/321defa28d7b7ca97c72292a15de201a192aeea9))
* **deps:** update dependency moment to v2.29.3 ([#1568](https://github.com/tf2pickup-org/server/issues/1568)) ([c8a05fc](https://github.com/tf2pickup-org/server/commit/c8a05fcad62dd520ca5d1ccc1b5dfc760e825e20))
* **deps:** update dependency mongoose to v6.3.2 ([#1190](https://github.com/tf2pickup-org/server/issues/1190)) ([ea8005a](https://github.com/tf2pickup-org/server/commit/ea8005a0876643b0e506a13f913c89e360ca74d1))
* **deps:** update dependency nestjs-real-ip to v2.1.0 ([#1544](https://github.com/tf2pickup-org/server/issues/1544)) ([7458df8](https://github.com/tf2pickup-org/server/commit/7458df87c126d38fbba617f44aacf00c69dc330d))
* **deps:** update dependency passport to v0.5.2 ([#1401](https://github.com/tf2pickup-org/server/issues/1401)) ([c8b2efe](https://github.com/tf2pickup-org/server/commit/c8b2efe0b0539cfded9132b69144d9175f49244d))
* **deps:** update dependency rxjs to v7.5.0 ([#1407](https://github.com/tf2pickup-org/server/issues/1407)) ([3bcfd1d](https://github.com/tf2pickup-org/server/commit/3bcfd1dc091f8526ae9ceb3477f8c45f89bb0e7a))
* **deps:** update dependency rxjs to v7.5.1 ([#1409](https://github.com/tf2pickup-org/server/issues/1409)) ([0595799](https://github.com/tf2pickup-org/server/commit/0595799af969da143f37df2c386e2b2b867bbb0b))
* **deps:** update dependency rxjs to v7.5.2 ([#1426](https://github.com/tf2pickup-org/server/issues/1426)) ([4c9d979](https://github.com/tf2pickup-org/server/commit/4c9d979527fc34904198d598ee3f489e42fe1039))
* **deps:** update dependency rxjs to v7.5.3 ([#1463](https://github.com/tf2pickup-org/server/issues/1463)) ([8356b80](https://github.com/tf2pickup-org/server/commit/8356b8031c9c249b3c8245f6c61870295f3c42d5))
* **deps:** update dependency rxjs to v7.5.4 ([#1465](https://github.com/tf2pickup-org/server/issues/1465)) ([d5044b1](https://github.com/tf2pickup-org/server/commit/d5044b1a554a7f763681a3080aeb7861c7baab33))
* **deps:** update dependency rxjs to v7.5.5 ([#1509](https://github.com/tf2pickup-org/server/issues/1509)) ([40d962f](https://github.com/tf2pickup-org/server/commit/40d962f9193e27efb968db9b716b2183bb136248))
* **deps:** update nest monorepo ([#1477](https://github.com/tf2pickup-org/server/issues/1477)) ([113fe30](https://github.com/tf2pickup-org/server/commit/113fe30c666c3dbab2c3a6cf3ccf3f28953fec7c))
* **deps:** update nest monorepo to v8.2.0 ([#1352](https://github.com/tf2pickup-org/server/issues/1352)) ([b8e94bc](https://github.com/tf2pickup-org/server/commit/b8e94bcc40679ec23be4e51f2ced18f720012840))
* **deps:** update nest monorepo to v8.2.3 ([#1377](https://github.com/tf2pickup-org/server/issues/1377)) ([8b0af3f](https://github.com/tf2pickup-org/server/commit/8b0af3f029565cd6b97e900ded3a13e52cbc15ec))
* **deps:** update nest monorepo to v8.2.4 ([#1402](https://github.com/tf2pickup-org/server/issues/1402)) ([9a712f1](https://github.com/tf2pickup-org/server/commit/9a712f1da5a84ec05be9c669445f2f84030e28e5))
* **deps:** update nest monorepo to v8.2.5 ([#1429](https://github.com/tf2pickup-org/server/issues/1429)) ([21c697c](https://github.com/tf2pickup-org/server/commit/21c697ce53b2030b5ed548cd3765cc5f0754b098))
* **deps:** update nest monorepo to v8.2.6 ([#1443](https://github.com/tf2pickup-org/server/issues/1443)) ([acd7403](https://github.com/tf2pickup-org/server/commit/acd7403e58c5009b4f354208bf5173fbf8c4fdff))
* **deps:** update nest monorepo to v8.4.0 ([#1498](https://github.com/tf2pickup-org/server/issues/1498)) ([aeeb355](https://github.com/tf2pickup-org/server/commit/aeeb355ff19482b6be6e16ada09c50703ea6590f))
* **deps:** update nest monorepo to v8.4.1 ([#1516](https://github.com/tf2pickup-org/server/issues/1516)) ([ceb98d0](https://github.com/tf2pickup-org/server/commit/ceb98d065274b452165fcccd6349fe038143c9a4))
* **deps:** update nest monorepo to v8.4.2 ([#1529](https://github.com/tf2pickup-org/server/issues/1529)) ([f891c3a](https://github.com/tf2pickup-org/server/commit/f891c3ad5d8f8d0ea79d5228f3e2dd38291481f0))
* **deps:** update nest monorepo to v8.4.3 ([#1539](https://github.com/tf2pickup-org/server/issues/1539)) ([a5bf71d](https://github.com/tf2pickup-org/server/commit/a5bf71dd59ddfbfae6faca795cc20ef57d950d9c))
* **deps:** upgrade mongoose to v6 ([#1263](https://github.com/tf2pickup-org/server/issues/1263)) ([8fd9dc5](https://github.com/tf2pickup-org/server/commit/8fd9dc5bd4921f4f19f3c5babd46a816d4a5ac08))
* **discord:** detect game was force-ended properly ([#1456](https://github.com/tf2pickup-org/server/issues/1456)) ([63f1913](https://github.com/tf2pickup-org/server/commit/63f1913632c841cc1a739f845f2054eb147a9a1c))
* fix typings ([#1533](https://github.com/tf2pickup-org/server/issues/1533)) ([9a7efc0](https://github.com/tf2pickup-org/server/commit/9a7efc02b5b78e675ac88e6a152804982d88799d))
* **game-configs:** use handlebars for config templates ([#1597](https://github.com/tf2pickup-org/server/issues/1597)) ([c7385ca](https://github.com/tf2pickup-org/server/commit/c7385caea4ebf63f8b36f5238f8bdd27592f4421))
* **game-servers:** add missing endpoint for getting all static game servers ([#1574](https://github.com/tf2pickup-org/server/issues/1574)) ([d35b832](https://github.com/tf2pickup-org/server/commit/d35b832d71615891953366c7e41f8d38100beb93))
* **game-servers:** add provider priority ([#1609](https://github.com/tf2pickup-org/server/issues/1609)) ([483d2ce](https://github.com/tf2pickup-org/server/commit/483d2ce0afb626dbd796facf2f19b25f137a92c6))
* **game-servers:** fix static game servers endpoint path ([#1575](https://github.com/tf2pickup-org/server/issues/1575)) ([d8f4c7a](https://github.com/tf2pickup-org/server/commit/d8f4c7ad501a00c7aa9800dea3de1bb2a150b13e))
* **game-servers:** randomize serveme.tf rcon password ([#1570](https://github.com/tf2pickup-org/server/issues/1570)) ([a8498e4](https://github.com/tf2pickup-org/server/commit/a8498e4df28293bc2354865997301df6fbaf79c5))
* **game-servers:** remove deprecated APIs ([#1571](https://github.com/tf2pickup-org/server/issues/1571)) ([869c48b](https://github.com/tf2pickup-org/server/commit/869c48be3db469f9f8e2a616b60d13fcc152fff6))
* **game-servers:** use gameserver-defined logsecret ([#1511](https://github.com/tf2pickup-org/server/issues/1511)) ([2ef0a7b](https://github.com/tf2pickup-org/server/commit/2ef0a7bb1e87463bbd393f5fede83939127af66a))
* **games:** better game server clean up logic ([#1371](https://github.com/tf2pickup-org/server/issues/1371)) ([4397c06](https://github.com/tf2pickup-org/server/commit/4397c0638c097501f18dc2fd7073606420db8631))
* **games:** get rid of player substitution race condition ([#1546](https://github.com/tf2pickup-org/server/issues/1546)) ([0279b81](https://github.com/tf2pickup-org/server/commit/0279b8151c8557637d96a5327baccb1fbf5f6797))
* **games:** launch orphaned games in a critical section ([#1523](https://github.com/tf2pickup-org/server/issues/1523)) ([ac68079](https://github.com/tf2pickup-org/server/commit/ac68079bd2b9ed9a663fe18af96cac13e07d0766))
* **serveme.tf:** don't throw error when the server is already running ([#1608](https://github.com/tf2pickup-org/server/issues/1608)) ([a9c6266](https://github.com/tf2pickup-org/server/commit/a9c6266b741ce3f8b4cb353b4157344f9b6175bd))


### Features

* **game-configs:** exec game config via rcon ([#1587](https://github.com/tf2pickup-org/server/issues/1587)) ([1d6737b](https://github.com/tf2pickup-org/server/commit/1d6737bf192dfc7855778d76c09f729852b521f5))
* **game-servers:** add start() method ([#1532](https://github.com/tf2pickup-org/server/issues/1532)) ([d5d5ef9](https://github.com/tf2pickup-org/server/commit/d5d5ef92b25150d3a8680ef8a062bf6310129353))
* **game-servers:** game server provider interface ([#1478](https://github.com/tf2pickup-org/server/issues/1478)) ([54e2bb2](https://github.com/tf2pickup-org/server/commit/54e2bb2309b6508bdfaeaab3191adeef2731ff18))
* **game-servers:** serveme.tf integration ([#1520](https://github.com/tf2pickup-org/server/issues/1520)) ([6064170](https://github.com/tf2pickup-org/server/commit/6064170ede73876584b18d5bae111c284c7d00c2))
* **players:** accept SteamId ([#1454](https://github.com/tf2pickup-org/server/issues/1454)) ([444bd49](https://github.com/tf2pickup-org/server/commit/444bd490de30aaf664e0c93fcf2d215bc2270c67))
* **queue:** add canMakeFriends queue slot flag ([#1547](https://github.com/tf2pickup-org/server/issues/1547)) ([6f4a071](https://github.com/tf2pickup-org/server/commit/6f4a0713275843090fb880460a623e10b728cfa5))
* **serveme.tf:** configure serveme.tf integration ([#1566](https://github.com/tf2pickup-org/server/issues/1566)) ([77e936f](https://github.com/tf2pickup-org/server/commit/77e936f8197278abe672b25264b88189da0b9b95))
* **statistics:** add game launch per day count ([#1361](https://github.com/tf2pickup-org/server/issues/1361)) ([3982644](https://github.com/tf2pickup-org/server/commit/3982644b00485d6f23526d6374208fb455738588))
* **statistics:** add game launch time spans stats ([#1357](https://github.com/tf2pickup-org/server/issues/1357)) ([e7e6b96](https://github.com/tf2pickup-org/server/commit/e7e6b96f591cfdc8de424bf2d80fd2dc060f9beb))
* **statistics:** add played map count statistics ([#1296](https://github.com/tf2pickup-org/server/issues/1296)) ([2c39f3d](https://github.com/tf2pickup-org/server/commit/2c39f3de5cd09b0f711f14384b21eafbe44c83b5))


### Reverts

* update dependency mongo to v4.4 ([8f9c2b8](https://github.com/tf2pickup-org/server/commit/8f9c2b86da1b819adc2ff6984fa245d0f4c12677))
* update mongo docker tag to v4.4 ([#1453](https://github.com/tf2pickup-org/server/issues/1453)) ([55f4e64](https://github.com/tf2pickup-org/server/commit/55f4e644b349f8b60635c3c5aa1bfc706d0be90f))


### BREAKING CHANGES

* **game-servers:** the /game-servers endpoint is no longer an endpoint for the static game servers
* **game-servers:** the gameserver heartbeat endpoint has been moved to /static-game-servers

## [8.2.1](https://github.com/tf2pickup-pl/server/compare/8.2.0...8.2.1) (2022-04-30)


### Bug Fixes

* **build:** add stable, nightly and sha docker tags ([#1588](https://github.com/tf2pickup-pl/server/issues/1588)) ([9b2a4ba](https://github.com/tf2pickup-pl/server/commit/9b2a4baf5ed70d44784731b9cacc1b6559be1b3c))

# [8.2.0](https://github.com/tf2pickup-org/server/compare/8.1.1...8.2.0) (2021-11-06)


### Features

* **game-servers:** override internal gameserver address ([#1349](https://github.com/tf2pickup-org/server/issues/1349)) ([6dd1af0](https://github.com/tf2pickup-org/server/commit/6dd1af043817e218d6af52ecac8d202cbb252b9c))

## [8.1.1](https://github.com/tf2pickup-org/server/compare/8.1.0...8.1.1) (2021-11-06)


### Bug Fixes

* **players:** set proper roles property for players ([#1348](https://github.com/tf2pickup-org/server/issues/1348)) ([cb60e5e](https://github.com/tf2pickup-org/server/commit/cb60e5eb93863033d37c6b219e0749d6086f1e67))

# [8.1.0](https://github.com/tf2pickup-org/server/compare/8.0.5...8.1.0) (2021-11-05)


### Bug Fixes

* **game-servers:** fix heartbeat DTO ([#1345](https://github.com/tf2pickup-org/server/issues/1345)) ([48b1ad6](https://github.com/tf2pickup-org/server/commit/48b1ad6683a191e983763cf2bb1304ead16ed3b7))


### Features

* **game-servers:** add game server priority ([#1336](https://github.com/tf2pickup-org/server/issues/1336)) ([fe317da](https://github.com/tf2pickup-org/server/commit/fe317dab477c03bef59ab22fff96182ee54e94d6))

## [8.0.5](https://github.com/tf2pickup-org/server/compare/8.0.4...8.0.5) (2021-11-04)


### Bug Fixes

* **game-servers:** fix migration for mongodb 4.0 ([#1343](https://github.com/tf2pickup-org/server/issues/1343)) ([ac6f5b0](https://github.com/tf2pickup-org/server/commit/ac6f5b02db0ecb05e12f1e29ad75ef7b5c002690))

## [8.0.4](https://github.com/tf2pickup-org/server/compare/8.0.3...8.0.4) (2021-11-03)


### Bug Fixes

* **deps:** update dependency @nestjs/axios to v0.0.3 ([#1319](https://github.com/tf2pickup-org/server/issues/1319)) ([a56bbe0](https://github.com/tf2pickup-org/server/commit/a56bbe03440eb0f2a59530674692c91f33c7a1bb))
* **deps:** update dependency @nestjs/config to v1.1.0 ([#1342](https://github.com/tf2pickup-org/server/issues/1342)) ([a08207b](https://github.com/tf2pickup-org/server/commit/a08207b90ec5cb1845fe7e97a88b24555caf885a))
* **game-servers:** better available gameserver detection ([#1341](https://github.com/tf2pickup-org/server/issues/1341)) ([535b540](https://github.com/tf2pickup-org/server/commit/535b5404a688c388e29487b723d6d6fed31cbea1))

## [8.0.3](https://github.com/tf2pickup-org/server/compare/8.0.2...8.0.3) (2021-10-29)


### Bug Fixes

* **auth:** fix passport authentication ([#1334](https://github.com/tf2pickup-org/server/issues/1334)) ([db26cdf](https://github.com/tf2pickup-org/server/commit/db26cdf75b3ddd072138d794e56969f5c8bf8de1))

## [8.0.2](https://github.com/tf2pickup-org/server/compare/8.0.1...8.0.2) (2021-10-28)


### Bug Fixes

* **deps:** update dependency @nestjs/config to v1.0.3 ([#1332](https://github.com/tf2pickup-org/server/issues/1332)) ([b67e3ab](https://github.com/tf2pickup-org/server/commit/b67e3ab0ab2b3e41361edfe2e409ec95d82d5213))
* **deps:** update dependency mongoose to v5.13.11 ([#1299](https://github.com/tf2pickup-org/server/issues/1299)) ([0b103f1](https://github.com/tf2pickup-org/server/commit/0b103f1166ce8cf7fa73ebda46717ebb00cea18d))
* **deps:** update dependency mongoose to v5.13.12 ([#1320](https://github.com/tf2pickup-org/server/issues/1320)) ([03098a4](https://github.com/tf2pickup-org/server/commit/03098a451127775d0014bec19e953fddaa2aa0e3))
* **deps:** update dependency passport-steam to v1.0.17 ([#1326](https://github.com/tf2pickup-org/server/issues/1326)) ([b32f5d3](https://github.com/tf2pickup-org/server/commit/b32f5d3bcb95a7cbf09b7e33e491394f56bd8bca))
* **games:** always release the gameserver ([#1333](https://github.com/tf2pickup-org/server/issues/1333)) ([baca4b6](https://github.com/tf2pickup-org/server/commit/baca4b669a4b59eef973d235a281e656d4aaf6d9))

## [8.0.1](https://github.com/tf2pickup-org/server/compare/8.0.0...8.0.1) (2021-10-12)


### Bug Fixes

* **games:** fix voice channel name in case it's empty ([#1298](https://github.com/tf2pickup-org/server/issues/1298)) ([9928618](https://github.com/tf2pickup-org/server/commit/9928618e32f68bea13417b0cd8da64af6f9239e1))

# [8.0.0](https://github.com/tf2pickup-org/server/compare/7.0.5...8.0.0) (2021-10-11)


### Bug Fixes

* **build:** Dockerfile fixes ([#1284](https://github.com/tf2pickup-org/server/issues/1284)) ([3e88969](https://github.com/tf2pickup-org/server/commit/3e889695bb14692225c3b39fb9e6ec9b3a53546b))
* **ci:** split tests to different jobs ([#1270](https://github.com/tf2pickup-org/server/issues/1270)) ([37beb19](https://github.com/tf2pickup-org/server/commit/37beb19cf6dfb54ed1e522cf7a5a803fc3142ccb))
* **deps:** pin dependencies ([#1278](https://github.com/tf2pickup-org/server/issues/1278)) ([3646370](https://github.com/tf2pickup-org/server/commit/36463709d9f514746f5149a6c4e1006832470894))
* **deps:** update dependency @nestjs/config to v1.0.2 ([#1272](https://github.com/tf2pickup-org/server/issues/1272)) ([f3926ed](https://github.com/tf2pickup-org/server/commit/f3926edfa5484e3879758a603aa35c47219e7113))
* **deps:** update dependency mongoose to v5.13.10 ([#1276](https://github.com/tf2pickup-org/server/issues/1276)) ([27fe665](https://github.com/tf2pickup-org/server/commit/27fe665aad1053e75f40f821839d3ca071589f0f))
* **deps:** update dependency passport to v0.5.0 ([#1245](https://github.com/tf2pickup-org/server/issues/1245)) ([b7877ad](https://github.com/tf2pickup-org/server/commit/b7877ad76697bb00db69af45cb1c972f0bd3daa6))
* **deps:** update dependency rxjs to v7.4.0 ([#1280](https://github.com/tf2pickup-org/server/issues/1280)) ([2a48e00](https://github.com/tf2pickup-org/server/commit/2a48e00b711fe6f822585ad7a02f575856e23d13))
* **environment:** use MONGODB_URI env ([#1290](https://github.com/tf2pickup-org/server/issues/1290)) ([32b6db4](https://github.com/tf2pickup-org/server/commit/32b6db48e5c18818fd08ec64b2617280783ece1e))
* **games:** handle lack of GameServer.voiceChannelName ([#1283](https://github.com/tf2pickup-org/server/issues/1283)) ([951a465](https://github.com/tf2pickup-org/server/commit/951a46520e82d093a4cf3613315a46536120abd9))
* **games:** respect voice server port ([#1291](https://github.com/tf2pickup-org/server/issues/1291)) ([05c5936](https://github.com/tf2pickup-org/server/commit/05c5936cb61c60fe2b1cc737fa888c35fbf1a1cb))
* **players:** ignore checks for initial user ([#1269](https://github.com/tf2pickup-org/server/issues/1269)) ([0cd15ff](https://github.com/tf2pickup-org/server/commit/0cd15ff7d5c9c0e5c5bd9e93cb1439119896e7fe))
* **twitch.tv:** fix streams not being refreshed ([#1281](https://github.com/tf2pickup-org/server/issues/1281)) ([f3b3ef6](https://github.com/tf2pickup-org/server/commit/f3b3ef6eb4b6db8649feedf74f85056ba07ddac1))


### Features

* **game-servers:** external gameserver registration ([#1229](https://github.com/tf2pickup-org/server/issues/1229)) ([c75f700](https://github.com/tf2pickup-org/server/commit/c75f700d5e7df522e4ab02f4bc341d05d82051f9))


### BREAKING CHANGES

* **environment:** MONGODB_* environment variables are removed in favor of
MONGODB_URI
* **game-servers:** Game server add, update and remove methods are removed. Instead, the heartbeat mechanism is implemented.

## [7.0.6](https://github.com/tf2pickup-pl/server/compare/7.0.5...7.0.6) (2021-10-07)


### Bug Fixes

* **twitch.tv:** fix streams not being refreshed ([#1281](https://github.com/tf2pickup-pl/server/issues/1281)) ([59fe4f9](https://github.com/tf2pickup-pl/server/commit/59fe4f93e065114c32347f53b8ceb59156aa5655))

## [7.0.5](https://github.com/tf2pickup-org/server/compare/7.0.4...7.0.5) (2021-10-03)


### Bug Fixes

* **deps:** update dependency @nestjs/axios to v0.0.2 ([#1244](https://github.com/tf2pickup-org/server/issues/1244)) ([7a93366](https://github.com/tf2pickup-org/server/commit/7a93366587899b75ed650e582bf277042db7c038))
* **deps:** update dependency rxjs to v7.3.1 ([#1266](https://github.com/tf2pickup-org/server/issues/1266)) ([da797c8](https://github.com/tf2pickup-org/server/commit/da797c89fba1b49ed65529a21bcdd8d365655353))
* **deps:** update nest monorepo to v8.0.7 ([#1246](https://github.com/tf2pickup-org/server/issues/1246)) ([5c37845](https://github.com/tf2pickup-org/server/commit/5c378451afda7e89a2df2ecca828a2ab9fdecf0a))
* **deps:** update nest monorepo to v8.0.8 ([#1254](https://github.com/tf2pickup-org/server/issues/1254)) ([04726dc](https://github.com/tf2pickup-org/server/commit/04726dc81e21835b2774a0e2c924973dc0c1bf7c))
* **deps:** update nest monorepo to v8.0.9 ([#1264](https://github.com/tf2pickup-org/server/issues/1264)) ([eb8f4d6](https://github.com/tf2pickup-org/server/commit/eb8f4d6b6366795151b543c1dd0b283f828de4f6))
* **discord:** fix revoked ban notification author ([#1268](https://github.com/tf2pickup-org/server/issues/1268)) ([10006c7](https://github.com/tf2pickup-org/server/commit/10006c78aaa225fc898a85e7518b226f800c3960))

## [7.0.4](https://github.com/tf2pickup-org/server/compare/7.0.3...7.0.4) (2021-09-22)


### Bug Fixes

* **games:** connect string is null initially ([#1243](https://github.com/tf2pickup-org/server/issues/1243)) ([40662c0](https://github.com/tf2pickup-org/server/commit/40662c0d3ac9600634c1de779550d14673745e8d))

## [7.0.3](https://github.com/tf2pickup-org/server/compare/7.0.2...7.0.3) (2021-09-16)


### Bug Fixes

* **deps:** update dependency passport-steam to v1.0.16 ([#1231](https://github.com/tf2pickup-org/server/issues/1231)) ([e90cf3d](https://github.com/tf2pickup-org/server/commit/e90cf3dd29621fe5fa81b36760f77b84ecf1f718))
* **players:** more verbose error logging ([#1233](https://github.com/tf2pickup-org/server/issues/1233)) ([518a0f0](https://github.com/tf2pickup-org/server/commit/518a0f00e933933868e464e277d4f2920dabfba5))

## [7.0.2](https://github.com/tf2pickup-org/server/compare/7.0.1...7.0.2) (2021-09-15)


### Bug Fixes

* **games:** serialize game assigned skills properly ([#1227](https://github.com/tf2pickup-org/server/issues/1227)) ([028e763](https://github.com/tf2pickup-org/server/commit/028e7633d0a5a92fc69c23093661e59d482bbd39))
* **games:** serialize gameServer properly ([#1226](https://github.com/tf2pickup-org/server/issues/1226)) ([5b5c5ed](https://github.com/tf2pickup-org/server/commit/5b5c5ed3853d44736490a428c38bb19b9fd34f0a))

## [7.0.1](https://github.com/tf2pickup-org/server/compare/7.0.0...7.0.1) (2021-09-14)


### Bug Fixes

* **discord:** import GamesModule ([#1225](https://github.com/tf2pickup-org/server/issues/1225)) ([dea1f3a](https://github.com/tf2pickup-org/server/commit/dea1f3a7f4e36eeefa2f23ff2a22c2930cb25f6b))

# [7.0.0](https://github.com/tf2pickup-org/server/compare/6.1.2...7.0.0) (2021-09-14)


### Bug Fixes

* **auth:** handle player registration errors properly ([#1220](https://github.com/tf2pickup-org/server/issues/1220)) ([dfe2aa4](https://github.com/tf2pickup-org/server/commit/dfe2aa4a332bc48cacbbc52d112826f9fdd43276))
* **ci:** fix ci test stability ([#1185](https://github.com/tf2pickup-org/server/issues/1185)) ([d7132d0](https://github.com/tf2pickup-org/server/commit/d7132d0e8d8d25ee62ceec70aaead4539db869cf))
* **deps:** pin dependency @nestjs/axios to 0.0.1 ([#1177](https://github.com/tf2pickup-org/server/issues/1177)) ([aa3921e](https://github.com/tf2pickup-org/server/commit/aa3921e3687b62452c7c4f08eea39f680c176e03))
* **deps:** update dependency @nestjs/mongoose to v8.0.1 ([#1169](https://github.com/tf2pickup-org/server/issues/1169)) ([0cc4896](https://github.com/tf2pickup-org/server/commit/0cc4896b07d306752809f90144b64a6c853ef57d))
* **deps:** update dependency async-mutex to v0.3.2 ([#1204](https://github.com/tf2pickup-org/server/issues/1204)) ([7cf812a](https://github.com/tf2pickup-org/server/commit/7cf812a96a683f3c2ad32088451544fe3c39a1c6))
* **deps:** update dependency mongoose to v5.13.8 ([#1187](https://github.com/tf2pickup-org/server/issues/1187)) ([bf384f5](https://github.com/tf2pickup-org/server/commit/bf384f5b2ea259d88de5ae3f516d9960f152f4b1))
* **deps:** update dependency mongoose to v5.13.9 ([#1213](https://github.com/tf2pickup-org/server/issues/1213)) ([2d814f0](https://github.com/tf2pickup-org/server/commit/2d814f0f35ccca62a8f7d74794bf8ab680eb7b68))
* **discord:** player substitute request notification ([#1223](https://github.com/tf2pickup-org/server/issues/1223)) ([9b551fa](https://github.com/tf2pickup-org/server/commit/9b551fa71b41b424d64ae3d995185e13606e1d40))
* **documents:** use default rules document ([#1210](https://github.com/tf2pickup-org/server/issues/1210)) ([7c9bdfc](https://github.com/tf2pickup-org/server/commit/7c9bdfc469ba877f4840eff1b7c5464a3c75a4f4))
* **games:** add adminId to substitute events ([#1219](https://github.com/tf2pickup-org/server/issues/1219)) ([c73a09e](https://github.com/tf2pickup-org/server/commit/c73a09e19b1df68434c3d6f3f0f28373607288c5))
* **games:** better player substitute events ([#1218](https://github.com/tf2pickup-org/server/issues/1218)) ([3865b18](https://github.com/tf2pickup-org/server/commit/3865b18d82b0ab49189a5df69def422a4a350c0f))
* **games:** fix playerPlayedClassCount() ([#1224](https://github.com/tf2pickup-org/server/issues/1224)) ([485dbd3](https://github.com/tf2pickup-org/server/commit/485dbd38dff190069c9eb7332b2551624d374aa0))
* get rid of HttpModule deprecation warnings ([#1175](https://github.com/tf2pickup-org/server/issues/1175)) ([528af27](https://github.com/tf2pickup-org/server/commit/528af275b60161f85cb74edf169bc8511ca8df4b))
* **players:** online player events serialization ([#1189](https://github.com/tf2pickup-org/server/issues/1189)) ([cc82b61](https://github.com/tf2pickup-org/server/commit/cc82b611cdc90a8307b6ed6f5a583cc810937a78))


* feat!(configuration): null voice server option (#1158) ([9d355ec](https://github.com/tf2pickup-org/server/commit/9d355ec6f5e2ed02e29e9164e8a2f7d8361e4f0a)), closes [#1158](https://github.com/tf2pickup-org/server/issues/1158)


### Features

* **configuration:** static link as voice server ([#1205](https://github.com/tf2pickup-org/server/issues/1205)) ([82c6acd](https://github.com/tf2pickup-org/server/commit/82c6acdf08ebfc413007d71286b082fffe0fa33f))
* **game-servers:** update game server ([#1206](https://github.com/tf2pickup-org/server/issues/1206)) ([a119328](https://github.com/tf2pickup-org/server/commit/a11932802f444a0098063b03948c737203fb654c))
* **games:** announce looking for substitute in game ([#1199](https://github.com/tf2pickup-org/server/issues/1199)) ([d32d49f](https://github.com/tf2pickup-org/server/commit/d32d49f57dcf2a30dc873347519ced1531847e2c))
* **players:** online player list ([#1188](https://github.com/tf2pickup-org/server/issues/1188)) ([f09b17e](https://github.com/tf2pickup-org/server/commit/f09b17e49cd54c6ee80b905929366489c1de8025))


### BREAKING CHANGES

* Game.mumbleUrl is gone.
* GameServer.mumbleChannelName is renamed to GameServer.voiceChannelName.

## [6.1.2](https://github.com/tf2pickup-org/server/compare/6.1.1...6.1.2) (2021-08-16)


### Bug Fixes

* **players:** verbose tf2 in-game hours verification logging ([#1170](https://github.com/tf2pickup-org/server/issues/1170)) ([5f3c6ef](https://github.com/tf2pickup-org/server/commit/5f3c6ef735cf5f228378b7a8f88d10e6920bcbff))

## [6.1.1](https://github.com/tf2pickup-org/server/compare/6.1.0...6.1.1) (2021-08-16)


### Bug Fixes

* **profile:** update active game id properly ([#1167](https://github.com/tf2pickup-org/server/issues/1167)) ([11e6009](https://github.com/tf2pickup-org/server/commit/11e6009374c8024824b6376f98348695625f5984))
* **queue:** handle gateway exceptions gracefully ([#1168](https://github.com/tf2pickup-org/server/issues/1168)) ([6727ed9](https://github.com/tf2pickup-org/server/commit/6727ed902d0ad2cbd91d2b83fbaeac9f05d82dbd))

# [6.1.0](https://github.com/tf2pickup-org/server/compare/6.0.2...6.1.0) (2021-08-12)


### Bug Fixes

* **deps:** update dependency mongoose to v5.13.7 ([#1160](https://github.com/tf2pickup-org/server/issues/1160)) ([7303ddc](https://github.com/tf2pickup-org/server/commit/7303ddc4bbaa6ce1be656ea92f2a44421426df25))


### Features

* add bball config ([#1162](https://github.com/tf2pickup-org/server/issues/1162)) ([1e6de8f](https://github.com/tf2pickup-org/server/commit/1e6de8fa63b9b02dc08418233e0c7ee4f81e42fc))
* **games:** use logsecret to match game events ([#1161](https://github.com/tf2pickup-org/server/issues/1161)) ([7382df3](https://github.com/tf2pickup-org/server/commit/7382df3382dc4678d50fb353229f9f97fa86b457))

## [6.0.2](https://github.com/tf2pickup-org/server/compare/6.0.1...6.0.2) (2021-08-10)


### Bug Fixes

* **deps:** update dependency mongoose to v5.13.6 ([#1153](https://github.com/tf2pickup-org/server/issues/1153)) ([daff935](https://github.com/tf2pickup-org/server/commit/daff935055de9f6f9a662035937e1d42623d8a4c))
* **games:** assign game to the replacement player ([#1147](https://github.com/tf2pickup-org/server/issues/1147)) ([a6a074d](https://github.com/tf2pickup-org/server/commit/a6a074da47dee2b61a3ffed0d3f44662e3debb90))
* **games:** free players after a game is force-ended ([#1157](https://github.com/tf2pickup-org/server/issues/1157)) ([cf34756](https://github.com/tf2pickup-org/server/commit/cf34756d081010e6e64c3d59fdfbfe403d275e53))

## [6.0.1](https://github.com/tf2pickup-org/server/compare/6.0.0...6.0.1) (2021-08-05)


### Bug Fixes

* **games:** get rid of GamesService.getPlayerActiveGames() ([#1144](https://github.com/tf2pickup-org/server/issues/1144)) ([857ec72](https://github.com/tf2pickup-org/server/commit/857ec72b69a2520bf685c5deea2af993da1b3b35))

# [6.0.0](https://github.com/tf2pickup-org/server/compare/6.0.0-beta.5...6.0.0) (2021-08-05)


### Bug Fixes

* **deps:** update nest monorepo to v8.0.6 ([#1138](https://github.com/tf2pickup-org/server/issues/1138)) ([0dfbdb0](https://github.com/tf2pickup-org/server/commit/0dfbdb0b66efc8de83da314038271f28b307c217))


### Features

* **migrations:** add migrations module ([#1143](https://github.com/tf2pickup-org/server/issues/1143)) ([576ac21](https://github.com/tf2pickup-org/server/commit/576ac2188c72d3ddba61f27e816aea20ed20a01c))

# [6.0.0-beta.5](https://github.com/tf2pickup-org/server/compare/6.0.0-beta.4...6.0.0-beta.5) (2021-08-05)


### Bug Fixes

* add mumble server configuration migration ([#1141](https://github.com/tf2pickup-org/server/issues/1141)) ([bef790e](https://github.com/tf2pickup-org/server/commit/bef790e50573c6d9573ccc90679a24ef0a939c0e))
* **games:** fix player connection status ([#1139](https://github.com/tf2pickup-org/server/issues/1139)) ([8dbdd59](https://github.com/tf2pickup-org/server/commit/8dbdd59bcb85fcae0ab7a47e6e036220d2785fd3))
* **twitch.tv:** fix disconnecting the profile ([#1140](https://github.com/tf2pickup-org/server/issues/1140)) ([2707458](https://github.com/tf2pickup-org/server/commit/270745813ea0b278f300fcd15116bddae623ef80))

# [6.0.0-beta.4](https://github.com/tf2pickup-org/server/compare/6.0.0-beta.3...6.0.0-beta.4) (2021-08-04)


### Bug Fixes

* **deps:** update dependency @nestjs/passport to v8.0.1 ([#1132](https://github.com/tf2pickup-org/server/issues/1132)) ([3bf0b7f](https://github.com/tf2pickup-org/server/commit/3bf0b7fd419e9494355a9cac15a23257d4501364))
* **games:** fix game references ([#1134](https://github.com/tf2pickup-org/server/issues/1134)) ([8bded35](https://github.com/tf2pickup-org/server/commit/8bded35316a7dff33432677a21ac20925753dda9))

# [6.0.0-beta.3](https://github.com/tf2pickup-org/server/compare/6.0.0-beta.2...6.0.0-beta.3) (2021-08-03)


### Bug Fixes

* **players:** player bans & skills queries ([#1130](https://github.com/tf2pickup-org/server/issues/1130)) ([652ad14](https://github.com/tf2pickup-org/server/commit/652ad1403a87ef9b7c616d37a8e049a0698f80f8))

# [6.0.0-beta.2](https://github.com/tf2pickup-org/server/compare/6.0.0-beta.1...6.0.0-beta.2) (2021-08-02)


### Bug Fixes

* **games:** fix player game count ([#1128](https://github.com/tf2pickup-org/server/issues/1128)) ([2496367](https://github.com/tf2pickup-org/server/commit/249636756bae5e759c75e9306c6a7d54dc938aaf))
* **twitch.tv:** fix fetching twich.tv linked profiles ([#1129](https://github.com/tf2pickup-org/server/issues/1129)) ([8a70189](https://github.com/tf2pickup-org/server/commit/8a701891d92ea562199eb9f3adb6e914a549eeab))

# [6.0.0-beta.1](https://github.com/tf2pickup-org/server/compare/6.0.0-beta.0...6.0.0-beta.1) (2021-08-02)


### Bug Fixes

* cors workaround socket adapter ([#1127](https://github.com/tf2pickup-org/server/issues/1127)) ([a462f08](https://github.com/tf2pickup-org/server/commit/a462f08522aff47a73079e1729ad71a255ab7087))

# [6.0.0-beta.0](https://github.com/tf2pickup-org/server/compare/5.0.5...6.0.0-beta.0) (2021-08-02)


### Bug Fixes

* **build:** use lts-alpine as docker base images ([#957](https://github.com/tf2pickup-org/server/issues/957)) ([3d285f4](https://github.com/tf2pickup-org/server/commit/3d285f46e8ff2b2e6a2ef8344f317c764969580b))
* **ci:** use mongo 4.0 image ([#1055](https://github.com/tf2pickup-org/server/issues/1055)) ([a7db6bc](https://github.com/tf2pickup-org/server/commit/a7db6bc2a3d3d3bed8cd92780881397346124706))
* **configuration:** players dynamic configuration ([#937](https://github.com/tf2pickup-org/server/issues/937)) ([bef8ffb](https://github.com/tf2pickup-org/server/commit/bef8ffb138c1538067f5d83aca5fc6a0142786b9))
* **configuration:** set voice server default value ([#1056](https://github.com/tf2pickup-org/server/issues/1056)) ([5b86c40](https://github.com/tf2pickup-org/server/commit/5b86c40f4aecb8717cc209e094126c954ba3f57c))
* **deps:** update dependency @nestjs/config to v1 ([#1085](https://github.com/tf2pickup-org/server/issues/1085)) ([8008469](https://github.com/tf2pickup-org/server/commit/800846940ae5a4fdf697db2ba06d4d37ae41dc32))
* **deps:** update dependency @nestjs/mongoose to v8 ([#1090](https://github.com/tf2pickup-org/server/issues/1090)) ([ebe6ef4](https://github.com/tf2pickup-org/server/commit/ebe6ef4d39d991e21df2be727c4fec0168defe5f))
* **deps:** update dependency @nestjs/passport to v7.1.6 ([#1068](https://github.com/tf2pickup-org/server/issues/1068)) ([d74db41](https://github.com/tf2pickup-org/server/commit/d74db41f050963dd6919952727002efc2a55a305))
* **deps:** update dependency @nestjs/passport to v8 ([#1092](https://github.com/tf2pickup-org/server/issues/1092)) ([fa56b16](https://github.com/tf2pickup-org/server/commit/fa56b1677b00a248d87f331fa53cf9272cc035ab))
* **deps:** update dependency @nestjs/schedule to v1 ([#1091](https://github.com/tf2pickup-org/server/issues/1091)) ([7f4dfdc](https://github.com/tf2pickup-org/server/commit/7f4dfdc94af999b10da3a6b63b6a31e25cc1f68f))
* **deps:** update dependency @nestjs/schedule to v1.0.1 ([#1118](https://github.com/tf2pickup-org/server/issues/1118)) ([967ee13](https://github.com/tf2pickup-org/server/commit/967ee138eac23641a0907d0413a79e455bf3714a))
* **deps:** update dependency @nestjs/serve-static to v2.2.2 ([#1083](https://github.com/tf2pickup-org/server/issues/1083)) ([804e1c7](https://github.com/tf2pickup-org/server/commit/804e1c70d2f19bbeaec348e6ab08a70eae2e8108))
* **deps:** update dependency @typegoose/typegoose to v7.6.0 ([#900](https://github.com/tf2pickup-org/server/issues/900)) ([24c12d3](https://github.com/tf2pickup-org/server/commit/24c12d394af1926e591ea4204cbd211fbb0a219b))
* **deps:** update dependency @typegoose/typegoose to v7.6.1 ([#1041](https://github.com/tf2pickup-org/server/issues/1041)) ([21fd630](https://github.com/tf2pickup-org/server/commit/21fd63093ad6aded65e8bacc7716e3a02a5cf734))
* **deps:** update dependency cache-manager to v3.4.2 ([#960](https://github.com/tf2pickup-org/server/issues/960)) ([58c253c](https://github.com/tf2pickup-org/server/commit/58c253c2e089e9b263a05ca3c91a9d8d1f08c707))
* **deps:** update dependency cache-manager to v3.4.3 ([#961](https://github.com/tf2pickup-org/server/issues/961)) ([e439e88](https://github.com/tf2pickup-org/server/commit/e439e88de41810bfeb6fb4d409fb58de8cfc7bf9))
* **deps:** update dependency cache-manager to v3.4.4 ([#1051](https://github.com/tf2pickup-org/server/issues/1051)) ([5f64c8d](https://github.com/tf2pickup-org/server/commit/5f64c8d11d8535ff20f7565787f91c721b12d0ba))
* **deps:** update dependency commander to v8 ([#1065](https://github.com/tf2pickup-org/server/issues/1065)) ([995a563](https://github.com/tf2pickup-org/server/commit/995a563a165aea9f0e40e79813a123522ed7dd58))
* **deps:** update dependency discord.js to v12.5.3 ([#969](https://github.com/tf2pickup-org/server/issues/969)) ([f350215](https://github.com/tf2pickup-org/server/commit/f3502157a64675ce462dddea6bee7f5d2f1151df))
* **deps:** update dependency gamedig to v3.0.1 ([#975](https://github.com/tf2pickup-org/server/issues/975)) ([f35612f](https://github.com/tf2pickup-org/server/commit/f35612fcc9281257fd44fdd395e52f80ac04e7d7))
* **deps:** update dependency gamedig to v3.0.2 ([#996](https://github.com/tf2pickup-org/server/issues/996)) ([a4bd361](https://github.com/tf2pickup-org/server/commit/a4bd361e37f1c67d2a9d284a347091fb5506b40b))
* **deps:** update dependency gamedig to v3.0.3 ([#998](https://github.com/tf2pickup-org/server/issues/998)) ([748079e](https://github.com/tf2pickup-org/server/commit/748079e4a8491b338068a6de0177b9a58f2d2885))
* **deps:** update dependency gamedig to v3.0.5 ([#1019](https://github.com/tf2pickup-org/server/issues/1019)) ([80e6bcb](https://github.com/tf2pickup-org/server/commit/80e6bcb42715e1d70b1b314db37565bf3fcc8cea))
* **deps:** update dependency gamedig to v3.0.6 ([#1095](https://github.com/tf2pickup-org/server/issues/1095)) ([f88f434](https://github.com/tf2pickup-org/server/commit/f88f434a6fa61d409b010ee2f642522a03f025c9))
* **deps:** update dependency gamedig to v3.0.7 ([#1096](https://github.com/tf2pickup-org/server/issues/1096)) ([d48efa0](https://github.com/tf2pickup-org/server/commit/d48efa03ea42956f207ded8c258084b0b36f89a5))
* **deps:** update dependency generate-password to v1.6.1 ([#1109](https://github.com/tf2pickup-org/server/issues/1109)) ([9e776fd](https://github.com/tf2pickup-org/server/commit/9e776fdfab0ea11d3b83df006c89040d6add30c3))
* **deps:** update dependency helmet to v4.5.0 ([#987](https://github.com/tf2pickup-org/server/issues/987)) ([a470ec2](https://github.com/tf2pickup-org/server/commit/a470ec239154f762760f403a053f86dbe8ce5ffb))
* **deps:** update dependency helmet to v4.6.0 ([#1000](https://github.com/tf2pickup-org/server/issues/1000)) ([c76f8ce](https://github.com/tf2pickup-org/server/commit/c76f8ce0eb54799cb707162ca40de52387473964))
* **deps:** update dependency mongoose to v5.13.3 ([#731](https://github.com/tf2pickup-org/server/issues/731)) ([fa64c0d](https://github.com/tf2pickup-org/server/commit/fa64c0df7f96264f1512a3ab0d86fc1701408917))
* **deps:** update dependency mongoose to v5.13.4 ([#1119](https://github.com/tf2pickup-org/server/issues/1119)) ([60d6c99](https://github.com/tf2pickup-org/server/commit/60d6c997897539fe74083cbeb36b66ef75600de6))
* **deps:** update dependency mongoose to v5.13.5 ([#1121](https://github.com/tf2pickup-org/server/issues/1121)) ([cb017c8](https://github.com/tf2pickup-org/server/commit/cb017c8c03509e5a66fde0339bcd094937815005))
* **deps:** update dependency rxjs to v6.6.7 ([#956](https://github.com/tf2pickup-org/server/issues/956)) ([41a4556](https://github.com/tf2pickup-org/server/commit/41a4556c84be6c9ab0306925bf443fd75b885b3c))
* **deps:** update dependency rxjs to v7.3.0 ([#999](https://github.com/tf2pickup-org/server/issues/999)) ([dce1c21](https://github.com/tf2pickup-org/server/commit/dce1c21fac6353af4ec7c1233f9f36c6d7b2d368))
* **deps:** update dependency steamid to v2 ([#1120](https://github.com/tf2pickup-org/server/issues/1120)) ([2231c5f](https://github.com/tf2pickup-org/server/commit/2231c5f772051e46092834a7bc059e4e98d3538d))
* **deps:** update nest monorepo to v7.6.17 ([#1017](https://github.com/tf2pickup-org/server/issues/1017)) ([db06479](https://github.com/tf2pickup-org/server/commit/db064792754de1605c87e50d3d09185b18ca5bbc))
* **deps:** update nest monorepo to v7.6.18 ([#1058](https://github.com/tf2pickup-org/server/issues/1058)) ([8d5a057](https://github.com/tf2pickup-org/server/commit/8d5a0579ec9fb22e5c12be7edb4024e75f373aee))
* **docs:** update badges ([e27353f](https://github.com/tf2pickup-org/server/commit/e27353f69292fdae10edb25d51b03d0bcdb83877))
* **docs:** update Ko-fi link ([fc95a6e](https://github.com/tf2pickup-org/server/commit/fc95a6ec1646a21e457dcabce2c6613086579164))
* get rid of console support ([#1117](https://github.com/tf2pickup-org/server/issues/1117)) ([6b8e3e4](https://github.com/tf2pickup-org/server/commit/6b8e3e40a39a3f697824a6b4061bd94b7c127273))
* get rid of typegoose ([#1114](https://github.com/tf2pickup-org/server/issues/1114)) ([b8ddf49](https://github.com/tf2pickup-org/server/commit/b8ddf498a96df0e3c1c5083876cd68ecd0431f16))
* **lint:** apply prettier rules ([#971](https://github.com/tf2pickup-org/server/issues/971)) ([b7b3e89](https://github.com/tf2pickup-org/server/commit/b7b3e8941f3bf2a720925aba21c1023121c44345))
* organization name update ([f432123](https://github.com/tf2pickup-org/server/commit/f432123367f23b0e94c63d28ac4c0ccdaa9bed4e))
* **players:** store active game in player model ([#1099](https://github.com/tf2pickup-org/server/issues/1099)) ([18a0d94](https://github.com/tf2pickup-org/server/commit/18a0d941ec115a774f6b6a3d48b34c6f2e8551ec))
* validate STEAM_USER against SteamID64 pattern ([#978](https://github.com/tf2pickup-org/server/issues/978)) ([618b54e](https://github.com/tf2pickup-org/server/commit/618b54e74d886285c4dc792a9b14d3e3a012ab8b))


* feat(players)!: extended player roles (#953) ([7577a1e](https://github.com/tf2pickup-org/server/commit/7577a1e27e22478ee60ede9ccb62750ce7703427)), closes [#953](https://github.com/tf2pickup-org/server/issues/953)


### Features

* **games:** dynamic Mumble server configuration ([#963](https://github.com/tf2pickup-org/server/issues/963)) ([f42fdc7](https://github.com/tf2pickup-org/server/commit/f42fdc75fcc55448cdb145be1f41920b5eac2b2e))
* **games:** remove assigned game for medics immediately ([#1126](https://github.com/tf2pickup-org/server/issues/1126)) ([9465adb](https://github.com/tf2pickup-org/server/commit/9465adb6e4036e282cd937e91c4d192badd1cef8))
* **twitch.tv:** promoted streams ([#1040](https://github.com/tf2pickup-org/server/issues/1040)) ([fa3df05](https://github.com/tf2pickup-org/server/commit/fa3df05f63b6cb269e825ba0d4fcf5ce4df323dd))


### BREAKING CHANGES

* `Player.role` is replaced by `Player.roles` and it is now an array of roles.

## [5.0.5](https://github.com/tf2pickup-pl/server/compare/5.0.4...5.0.5) (2021-03-26)


### Bug Fixes

* **games:** fix game dereference ([#951](https://github.com/tf2pickup-pl/server/issues/951)) ([b8caca9](https://github.com/tf2pickup-pl/server/commit/b8caca930fa18c76d888c34bb7117ace7653274b))

## [5.0.4](https://github.com/tf2pickup-pl/server/compare/5.0.3...5.0.4) (2021-03-25)


### Bug Fixes

* **build:** add migrations to docker image ([1713947](https://github.com/tf2pickup-pl/server/commit/17139478035310bdb2145111b226aec75c05382f))

## [5.0.3](https://github.com/tf2pickup-pl/server/compare/5.0.2...5.0.3) (2021-03-25)


### Bug Fixes

* **players:** handle TF2 in-game hours verification errors properly ([#948](https://github.com/tf2pickup-pl/server/issues/948)) ([f82d6bb](https://github.com/tf2pickup-pl/server/commit/f82d6bb9e4340007be175896bc841598fb499b4e))

## [5.0.2](https://github.com/tf2pickup-pl/server/compare/5.0.1...5.0.2) (2021-03-25)


### Bug Fixes

* **migration:** add game server model migration ([a3150da](https://github.com/tf2pickup-pl/server/commit/a3150da8a2488833d482101ca7b08746a1a7c94e))

## [5.0.1](https://github.com/tf2pickup-pl/server/compare/5.0.0...5.0.1) (2021-03-25)


### Bug Fixes

* **ci:** fix Docker image build script ([c3dd6fc](https://github.com/tf2pickup-pl/server/commit/c3dd6fc779c04aa8c9a9e771523776974f8ca2df))

# [5.0.0](https://github.com/tf2pickup-pl/server/compare/4.0.1...5.0.0) (2021-03-25)


### Bug Fixes

* **auth:** store keys in database ([#922](https://github.com/tf2pickup-pl/server/issues/922)) ([60ae7c3](https://github.com/tf2pickup-pl/server/commit/60ae7c38bc98f1b82af0eef7a41a7a6ff29df6c9))
* **build:** docker image build improvements ([#924](https://github.com/tf2pickup-pl/server/issues/924)) ([490ba60](https://github.com/tf2pickup-pl/server/commit/490ba60ba42abd9bbe9bf9b8aa23113c0c338815))
* **ci:** test, lint & build on release branches and tags ([#935](https://github.com/tf2pickup-pl/server/issues/935)) ([292037b](https://github.com/tf2pickup-pl/server/commit/292037ba9b06b7393c3d24d78ce7e11b8b0a15f3))
* **configuration:** use DTO in controller ([#936](https://github.com/tf2pickup-pl/server/issues/936)) ([ba39434](https://github.com/tf2pickup-pl/server/commit/ba39434fdf08a3ab65b0b2998ef62afc9a119c42))
* **deps:** update dependency commander to v7.2.0 ([#940](https://github.com/tf2pickup-pl/server/issues/940)) ([3473d36](https://github.com/tf2pickup-pl/server/commit/3473d369e87feb5dca6594431f58674aec29ab8c))
* **deps:** update nest monorepo to v7.6.14 ([#915](https://github.com/tf2pickup-pl/server/issues/915)) ([e441bec](https://github.com/tf2pickup-pl/server/commit/e441bece6bee90c91d598bfb696c8b20656716f5))
* **deps:** update nest monorepo to v7.6.15 ([#941](https://github.com/tf2pickup-pl/server/issues/941)) ([b73ec35](https://github.com/tf2pickup-pl/server/commit/b73ec350dad352c08031d96513a65067387e6dde))
* **discord:** game force ended notification ([#946](https://github.com/tf2pickup-pl/server/issues/946)) ([ed19ca1](https://github.com/tf2pickup-pl/server/commit/ed19ca1fe1f153800a31e868147a06ca9a729ac7))
* **discord:** make DiscordModule optional ([#928](https://github.com/tf2pickup-pl/server/issues/928)) ([71492be](https://github.com/tf2pickup-pl/server/commit/71492beccc80c8a9f8cf5da7b94fddda1875ed35))
* **e2e:** use random database name ([#945](https://github.com/tf2pickup-pl/server/issues/945)) ([5777986](https://github.com/tf2pickup-pl/server/commit/57779862831fabfbe1dbb2bab7d4707cb89c5396))
* **game-servers:** don't remove game servers permamently ([#917](https://github.com/tf2pickup-pl/server/issues/917)) ([76e84ed](https://github.com/tf2pickup-pl/server/commit/76e84ed626c8cc84fcf746f280fc4a481b7998a0))
* **players:** fix force create player ([#927](https://github.com/tf2pickup-pl/server/issues/927)) ([a0f1588](https://github.com/tf2pickup-pl/server/commit/a0f1588208320c53ae637f24b072acf41c182fc2))
* **twitch.tv:** disconnect twitch.tv profile ([#939](https://github.com/tf2pickup-pl/server/issues/939)) ([dcec891](https://github.com/tf2pickup-pl/server/commit/dcec891801cab90fc9bbf7983265e17262d027b1))


### Features

* **game-servers:** game server diagnostics ([#942](https://github.com/tf2pickup-pl/server/issues/942)) ([6cda591](https://github.com/tf2pickup-pl/server/commit/6cda591a424d0e95ab1e8e8c452f632ca8d66c43))
* **game-servers:** game server notifications on Discord ([#944](https://github.com/tf2pickup-pl/server/issues/944)) ([f6bbb89](https://github.com/tf2pickup-pl/server/commit/f6bbb89cecdfc4f18f9d1947689a7d9cc8ac06e5))
* make it possible to scramble maps ([#926](https://github.com/tf2pickup-pl/server/issues/926)) ([69b78dc](https://github.com/tf2pickup-pl/server/commit/69b78dcbc8fd7c9bcc046bc1187296cdb8c5a47a))


### Refactors

* ConfigurationModule redesign (#934) ([be9cbb6](https://github.com/tf2pickup-pl/server/commit/be9cbb67c6fc501259c11967b8a7cb4c577ea9c6)) ([#934](https://github.com/tf2pickup-pl/server/issues/934))

### BREAKING CHANGES

* The old configuration endpoint is not compatible with the new one.

## [4.0.1](https://github.com/tf2pickup-pl/server/compare/4.0.0...4.0.1) (2021-03-12)


### Bug Fixes

* **auth:** more verbose steam API errors ([#913](https://github.com/tf2pickup-pl/server/issues/913)) ([5e44cef](https://github.com/tf2pickup-pl/server/commit/5e44cef277fb36d30308ca7d35b2eae7fef347f1))

# [4.0.0](https://github.com/tf2pickup-pl/server/compare/3.8.4...4.0.0) (2021-03-11)


### Bug Fixes

* create empty rules initially ([#912](https://github.com/tf2pickup-pl/server/issues/912)) ([6d21158](https://github.com/tf2pickup-pl/server/commit/6d2115875a087cc4ff08d5caa98d40820c0675bb))
* get rid of LogReceiver bind address ([#910](https://github.com/tf2pickup-pl/server/issues/910)) ([69c3e68](https://github.com/tf2pickup-pl/server/commit/69c3e68bf57c8c4127565f9c0d10cf64a5a5c42e))
* **deps:** update dependency @nestjs/schedule to v0.4.3 ([#908](https://github.com/tf2pickup-pl/server/issues/908)) ([f13fae2](https://github.com/tf2pickup-pl/server/commit/f13fae28428d548b365542edb71461537fa66383))
* add launch.json ([a1f76ee](https://github.com/tf2pickup-pl/server/commit/a1f76ee6b18d9c49f434f599c51c2cbe6951379e))
* fix crash when querying unassigned skill ([#887](https://github.com/tf2pickup-pl/server/issues/887)) ([3a94c72](https://github.com/tf2pickup-pl/server/commit/3a94c72d7ce513a6406455bbcea4d4e51235248e))
* fix player registration ([#898](https://github.com/tf2pickup-pl/server/issues/898)) ([f980e8e](https://github.com/tf2pickup-pl/server/commit/f980e8e1a5424814b16aceab97d060e6009a77ad))
* move hasAcceptedRules prop to the Profile model ([#901](https://github.com/tf2pickup-pl/server/issues/901)) ([87a1587](https://github.com/tf2pickup-pl/server/commit/87a1587e6c6fa65de4f17a79c90d93c280d17608))
* **deps:** update dependency cache-manager to v3.4.1 ([#889](https://github.com/tf2pickup-pl/server/issues/889)) ([1792112](https://github.com/tf2pickup-pl/server/commit/17921122c06ba4c6fc61b15e444796b64ac09ecf))


### Features

* Docker releases ([#911](https://github.com/tf2pickup-pl/server/issues/911)) ([43ad025](https://github.com/tf2pickup-pl/server/commit/43ad02579c2ebf920a67bd4ea43fdca525cdc7fa))
* editable documents (#886) ([2408735](https://github.com/tf2pickup-pl/server/commit/240873597a8ae4c8eb6bc831e4a76178bd0c00b8)), closes [#886](https://github.com/tf2pickup-pl/server/issues/886)


### Refactors

* better player module models handling (#891) ([13a2051](https://github.com/tf2pickup-pl/server/commit/13a20519d0427977374dec3ed9ca8efc6d77342b)), closes [#891](https://github.com/tf2pickup-pl/server/issues/891)


### BREAKING CHANGES

* The Profile API is changed - review the new DTO.
* The Documents API is rewritten, dropping old functionality.

## [3.8.4](https://github.com/tf2pickup-pl/server/compare/3.8.3...3.8.4) (2021-03-05)


### Bug Fixes

* make default player skill query valid ([#888](https://github.com/tf2pickup-pl/server/issues/888)) ([e48bb36](https://github.com/tf2pickup-pl/server/commit/e48bb36a26a78ed01d1d323ea175b81606dbfd5d))

## [3.8.3](https://github.com/tf2pickup-pl/server/compare/3.8.2...3.8.3) (2021-03-04)


### Bug Fixes

* fix crash when querying unassigned skill ([#887](https://github.com/tf2pickup-pl/server/issues/887)) ([4430ce6](https://github.com/tf2pickup-pl/server/commit/4430ce67229957d57785a6c826756a266ce2721b))

## [3.8.2](https://github.com/tf2pickup-pl/server/compare/3.8.1...3.8.2) (2021-03-03)


### Bug Fixes

* fix player updated notification profile link ([#882](https://github.com/tf2pickup-pl/server/issues/882)) ([32d3d44](https://github.com/tf2pickup-pl/server/commit/32d3d44f8d98c52eb23a042d86f2619dda1ee4c1))
* skip empty admin notifications ([#883](https://github.com/tf2pickup-pl/server/issues/883)) ([2a4fddc](https://github.com/tf2pickup-pl/server/commit/2a4fddc4c56315a81139413485d66618f05a5b1f))

## [3.8.1](https://github.com/tf2pickup-pl/server/compare/3.8.0...3.8.1) (2021-03-03)


### Bug Fixes

* fix discord embeds author avatar URL ([#881](https://github.com/tf2pickup-pl/server/issues/881)) ([6a82b76](https://github.com/tf2pickup-pl/server/commit/6a82b76bbddf77a024508be7723386919a2f80c0))

# [3.8.0](https://github.com/tf2pickup-pl/server/compare/3.7.1...3.8.0) (2021-03-03)


### Bug Fixes

* **deps:** update dependency @nestjs/mongoose to v7.2.4 ([#873](https://github.com/tf2pickup-pl/server/issues/873)) ([0017387](https://github.com/tf2pickup-pl/server/commit/0017387c083ea4f6a798fd028398f8cc40658e23))
* **deps:** update dependency @typegoose/typegoose to v7.5.0 ([#879](https://github.com/tf2pickup-pl/server/issues/879)) ([b92efe8](https://github.com/tf2pickup-pl/server/commit/b92efe8d8989ad7895d7c1f3c95c2570909210b1))
* **deps:** update dependency async-mutex to v0.3.1 ([#866](https://github.com/tf2pickup-pl/server/issues/866)) ([6efc8b5](https://github.com/tf2pickup-pl/server/commit/6efc8b51e53a323cb5dbe49778631391deb86167))
* **deps:** update dependency gamedig to v3 ([#871](https://github.com/tf2pickup-pl/server/issues/871)) ([2b61478](https://github.com/tf2pickup-pl/server/commit/2b6147852fe96d1ba0131b8efda4a0d292a1f9ea))
* get rid of circular dependencies ([#878](https://github.com/tf2pickup-pl/server/issues/878)) ([3b4c1d6](https://github.com/tf2pickup-pl/server/commit/3b4c1d62f43a5ab77ce2b9cef2ba7a20e606c3af))
* **deps:** update dependency lodash to v4.17.21 ([#862](https://github.com/tf2pickup-pl/server/issues/862)) ([7bdac74](https://github.com/tf2pickup-pl/server/commit/7bdac746b2b6a21c263361d1c83e6afdb558756b))
* **deps:** update dependency rxjs to v6.6.6 ([#870](https://github.com/tf2pickup-pl/server/issues/870)) ([f9789ce](https://github.com/tf2pickup-pl/server/commit/f9789ce9b17c486fb839ed7a37c82cd271304b42))
* **deps:** update nest monorepo to v7.6.13 ([#864](https://github.com/tf2pickup-pl/server/issues/864)) ([4985bc8](https://github.com/tf2pickup-pl/server/commit/4985bc8237087c4092cf934ed0bd536aa62f71af))


### Features

* configurable default player skill ([#855](https://github.com/tf2pickup-pl/server/issues/855)) ([59e57af](https://github.com/tf2pickup-pl/server/commit/59e57afa62f4ab8b6993a9552f89192e198af7f9))
* configurable whitelist id ([#863](https://github.com/tf2pickup-pl/server/issues/863)) ([931e04a](https://github.com/tf2pickup-pl/server/commit/931e04a2f7996b433b5519c688afd923d91b9574))
* dynamic configuration ([#853](https://github.com/tf2pickup-pl/server/issues/853)) ([52de626](https://github.com/tf2pickup-pl/server/commit/52de62646513aed0c53827a5cae01e9a52060015))

## [3.7.1](https://github.com/tf2pickup-pl/server/compare/3.7.0...3.7.1) (2021-02-16)


### Bug Fixes

* **deps:** update dependency class-transformer to v0.4.0 ([#849](https://github.com/tf2pickup-pl/server/issues/849)) ([2c95eea](https://github.com/tf2pickup-pl/server/commit/2c95eeaa9c43b7644a65563004f628dac7e8ef38))
* **deps:** update dependency commander to v7.1.0 ([#851](https://github.com/tf2pickup-pl/server/issues/851)) ([566dac7](https://github.com/tf2pickup-pl/server/commit/566dac7c9ae6c41b9a86133582a40327d685d2fd))
* debounceTime queue slots when sending discord prompts ([#848](https://github.com/tf2pickup-pl/server/issues/848)) ([f0b31de](https://github.com/tf2pickup-pl/server/commit/f0b31de0385fe620947bd35a5a78063d58e786ba))

# [3.7.0](https://github.com/tf2pickup-pl/server/compare/3.6.3...3.7.0) (2021-02-14)


### Bug Fixes

* **deps:** pin dependency async-mutex to 0.3.0 ([#846](https://github.com/tf2pickup-pl/server/issues/846)) ([214b07c](https://github.com/tf2pickup-pl/server/commit/214b07c5352a0a422b7bb8354ea185a77a8858f7))
* pick free game server without race condition ([#845](https://github.com/tf2pickup-pl/server/issues/845)) ([a5fafc5](https://github.com/tf2pickup-pl/server/commit/a5fafc5914bd1fe93cc0e271d864ab5dec2df289))


### Features

* player preferences ([#847](https://github.com/tf2pickup-pl/server/issues/847)) ([28ffa6f](https://github.com/tf2pickup-pl/server/commit/28ffa6fdae5a9479d70f51643fcefd5cd1729fe9))

## [3.6.3](https://github.com/tf2pickup-pl/server/compare/3.6.2...3.6.3) (2021-02-11)


### Bug Fixes

* handle setting initial skill of a player ([#840](https://github.com/tf2pickup-pl/server/issues/840)) ([68794c9](https://github.com/tf2pickup-pl/server/commit/68794c9e364876594526f5086806d984cbe99d97))

## [3.6.2](https://github.com/tf2pickup-pl/server/compare/3.6.1...3.6.2) (2021-02-10)


### Bug Fixes

* cleaner discord queue prompts ([#836](https://github.com/tf2pickup-pl/server/issues/836)) ([ba6919c](https://github.com/tf2pickup-pl/server/commit/ba6919ce21a143e27feb6f06910311f2e1e05b40))
* ping players with sub request embed in one message ([#838](https://github.com/tf2pickup-pl/server/issues/838)) ([2b9e23d](https://github.com/tf2pickup-pl/server/commit/2b9e23d360c4b7d1ae7c2e17b145796331be3e8f))
* support game servers without a domain ([#837](https://github.com/tf2pickup-pl/server/issues/837)) ([2a6ee16](https://github.com/tf2pickup-pl/server/commit/2a6ee1663826b18d7c6da4ac19fa0ae8035403a9))
* **deps:** update nest monorepo to v7.6.12 ([#835](https://github.com/tf2pickup-pl/server/issues/835)) ([84795b9](https://github.com/tf2pickup-pl/server/commit/84795b9400a591b62cf0eaccc52a652ddc9141cc))

## [3.6.1](https://github.com/tf2pickup-pl/server/compare/3.6.0...3.6.1) (2021-02-09)


### Bug Fixes

* player treshold setting ([#834](https://github.com/tf2pickup-pl/server/issues/834)) ([ce92507](https://github.com/tf2pickup-pl/server/commit/ce9250725cd760b39e6bff6b08f10af7a66fe303))

# [3.6.0](https://github.com/tf2pickup-pl/server/compare/3.5.0...3.6.0) (2021-02-09)


### Features

* rich discord prompts ([#832](https://github.com/tf2pickup-pl/server/issues/832)) ([3fc4a52](https://github.com/tf2pickup-pl/server/commit/3fc4a5253398a887e44a5f76817095942858adde))

# [3.5.0](https://github.com/tf2pickup-pl/server/compare/3.4.0...3.5.0) (2021-02-06)


### Bug Fixes

* update queue configs ([9382f43](https://github.com/tf2pickup-pl/server/commit/9382f43005e9cfb2ff7bc9d95208f7e043762bcd))
* **deps:** update dependency @nestjs/config to v0.6.2 ([#803](https://github.com/tf2pickup-pl/server/issues/803)) ([f8fdbda](https://github.com/tf2pickup-pl/server/commit/f8fdbda3b96ca2d36da3bf36080b50b95dfcc66a))
* **deps:** update dependency @nestjs/mongoose to v7.2.3 ([#826](https://github.com/tf2pickup-pl/server/issues/826)) ([c3eee2b](https://github.com/tf2pickup-pl/server/commit/c3eee2bc639d22e55f8e18478d6c798c3714c1f3))
* get rid of avatarUrl ([#813](https://github.com/tf2pickup-pl/server/issues/813)) ([927cbc3](https://github.com/tf2pickup-pl/server/commit/927cbc343497754fb383eff346d4dad62c826c12))
* **deps:** update dependency @nestjs/config to v0.6.3 ([#818](https://github.com/tf2pickup-pl/server/issues/818)) ([7e57792](https://github.com/tf2pickup-pl/server/commit/7e577926ba972a6f1549cc7f6291019f4cf97ead))
* **deps:** update dependency @nestjs/mongoose to v7.2.2 ([#791](https://github.com/tf2pickup-pl/server/issues/791)) ([510741e](https://github.com/tf2pickup-pl/server/commit/510741e3df1102ccbff04b4f5d721de7a17597bb))
* **deps:** update dependency @nestjs/schedule to v0.4.2 ([#804](https://github.com/tf2pickup-pl/server/issues/804)) ([2532926](https://github.com/tf2pickup-pl/server/commit/253292620828b15d29e3cc62fdb6830104257506))
* **deps:** update dependency @typegoose/typegoose to v7.4.7 ([#786](https://github.com/tf2pickup-pl/server/issues/786)) ([3e469d3](https://github.com/tf2pickup-pl/server/commit/3e469d3292e87b3fbecd4d4968de91ec82e763b2))
* **deps:** update dependency @typegoose/typegoose to v7.4.8 ([#798](https://github.com/tf2pickup-pl/server/issues/798)) ([9570226](https://github.com/tf2pickup-pl/server/commit/9570226731460afa38b3e560176ac8fcd72a8684))
* **deps:** update dependency class-transformer to v0.3.2 ([#790](https://github.com/tf2pickup-pl/server/issues/790)) ([9c1790d](https://github.com/tf2pickup-pl/server/commit/9c1790d1cc018e28cd4e4c9a7ecd1717d2f621a5))
* **deps:** update dependency class-validator to v0.13.0 ([#783](https://github.com/tf2pickup-pl/server/issues/783)) ([991938c](https://github.com/tf2pickup-pl/server/commit/991938c7be4b32d662c1af94bcbfa8c7db6de8d2))
* **deps:** update dependency class-validator to v0.13.1 ([#789](https://github.com/tf2pickup-pl/server/issues/789)) ([7f76609](https://github.com/tf2pickup-pl/server/commit/7f7660919a25221bce783ade1813cc4f4580abe9))
* **deps:** update dependency commander to v7 ([#793](https://github.com/tf2pickup-pl/server/issues/793)) ([f47e4e7](https://github.com/tf2pickup-pl/server/commit/f47e4e744d82c77675e2169d1e78f922eb22115b))
* **deps:** update dependency generate-password to v1.6.0 ([#792](https://github.com/tf2pickup-pl/server/issues/792)) ([5f1feb9](https://github.com/tf2pickup-pl/server/commit/5f1feb94e29101955c720b2b8019188b94a231c8))
* **deps:** update dependency helmet to v4.4.1 ([#796](https://github.com/tf2pickup-pl/server/issues/796)) ([9384112](https://github.com/tf2pickup-pl/server/commit/9384112a75bbe35457b4d3d790988142d01921cf))
* **deps:** update nest monorepo to v7.6.11 ([#821](https://github.com/tf2pickup-pl/server/issues/821)) ([d0e165b](https://github.com/tf2pickup-pl/server/commit/d0e165b4ad258c807dffdb7c4f36a552a7b2e485))
* **deps:** update nest monorepo to v7.6.6 ([#810](https://github.com/tf2pickup-pl/server/issues/810)) ([a3824a8](https://github.com/tf2pickup-pl/server/commit/a3824a8adc325ee14583fade09e1acbbdc37b0a9))
* **deps:** update nest monorepo to v7.6.7 ([#811](https://github.com/tf2pickup-pl/server/issues/811)) ([2bdcb1e](https://github.com/tf2pickup-pl/server/commit/2bdcb1e6f96a8b3032b87bd17d8bbbcec86449d2))
* **deps:** update nest monorepo to v7.6.8 ([#816](https://github.com/tf2pickup-pl/server/issues/816)) ([447db41](https://github.com/tf2pickup-pl/server/commit/447db41dd633d61c3dc2db0b8cca29cfcebc8863))
* **deps:** update nest monorepo to v7.6.9 ([#819](https://github.com/tf2pickup-pl/server/issues/819)) ([8e1b221](https://github.com/tf2pickup-pl/server/commit/8e1b22194bc561c029675f1c709c7463906c95da))
* mention players when a sub is needed ([#812](https://github.com/tf2pickup-pl/server/issues/812)) ([f168be5](https://github.com/tf2pickup-pl/server/commit/f168be5160450aac1277a0a72e821b330c415b78))


### Features

* dynamic map pool ([#805](https://github.com/tf2pickup-pl/server/issues/805)) ([f88097c](https://github.com/tf2pickup-pl/server/commit/f88097c2829711fd6dfe80404569e15c753afb52))
* force create player account ([#828](https://github.com/tf2pickup-pl/server/issues/828)) ([0cf5562](https://github.com/tf2pickup-pl/server/commit/0cf5562873e7c455af7596b8db4a365a768a0b89))
* make TwitchModule optional ([#827](https://github.com/tf2pickup-pl/server/issues/827)) ([d5c01f0](https://github.com/tf2pickup-pl/server/commit/d5c01f01976fc0f30efcf3509086b21ffa589dc1))

# [3.4.0](https://github.com/tf2pickup-pl/server/compare/3.3.4...3.4.0) (2021-01-09)


### Bug Fixes

* **deps:** update dependency @nestjs/mongoose to v7.2.1 ([#778](https://github.com/tf2pickup-pl/server/issues/778)) ([6c76120](https://github.com/tf2pickup-pl/server/commit/6c76120dcfbf7f79c847b462b9593440369d3f21))


### Features

* **queue:** populate queue slot players ([#780](https://github.com/tf2pickup-pl/server/issues/780)) ([cdf76d8](https://github.com/tf2pickup-pl/server/commit/cdf76d8a14ffad818cedd7382def6e4c0ef4da41))
* add caching support for PlayersModule ([#781](https://github.com/tf2pickup-pl/server/issues/781)) ([c283e22](https://github.com/tf2pickup-pl/server/commit/c283e22b6da55c0a9cb8d80e2fb5cdc16185d819))

## [3.3.4](https://github.com/tf2pickup-pl/server/compare/3.3.3...3.3.4) (2021-01-07)


### Bug Fixes

* handle player subs properly ([#776](https://github.com/tf2pickup-pl/server/issues/776)) ([3075d4e](https://github.com/tf2pickup-pl/server/commit/3075d4e6fd39559a9cfc7574be867d00fd6ca303))

## [3.3.3](https://github.com/tf2pickup-pl/server/compare/3.3.2...3.3.3) (2021-01-05)


### Bug Fixes

* add client/index.html ([#767](https://github.com/tf2pickup-pl/server/issues/767)) ([e4936b2](https://github.com/tf2pickup-pl/server/commit/e4936b208d39ec84b93f14ac7ef9a12c5da16272))
* dont notify when setting the same player's name ([#775](https://github.com/tf2pickup-pl/server/issues/775)) ([4ebfc6e](https://github.com/tf2pickup-pl/server/commit/4ebfc6eaedab093929f37b01b3c6fd878d55fea7))
* make game updates atomic ([#774](https://github.com/tf2pickup-pl/server/issues/774)) ([cb6ad98](https://github.com/tf2pickup-pl/server/commit/cb6ad98835a8bb339c96fd67b3e2d535a65d078b))

## [3.3.2](https://github.com/tf2pickup-pl/server/compare/3.3.1...3.3.2) (2020-12-30)


### Bug Fixes

* update 9v9 mappool ([9b3113b](https://github.com/tf2pickup-pl/server/commit/9b3113b9dc642b30d8387827920cb290264ed1c9))
* **deps:** update nest monorepo to v7.6.5 ([#766](https://github.com/tf2pickup-pl/server/issues/766)) ([8063791](https://github.com/tf2pickup-pl/server/commit/8063791028ce52b04bc51e2d8963b77875f15b66))

## [3.3.1](https://github.com/tf2pickup-pl/server/compare/3.3.0...3.3.1) (2020-12-30)


### Bug Fixes

* **deps:** update dependency @typegoose/typegoose to v7.4.6 ([#765](https://github.com/tf2pickup-pl/server/issues/765)) ([662eb68](https://github.com/tf2pickup-pl/server/commit/662eb6873dc2def0e8d167a9ae5de0e3a87fdadc))
* don't add replaced players ([#762](https://github.com/tf2pickup-pl/server/issues/762)) ([c2d7587](https://github.com/tf2pickup-pl/server/commit/c2d75879cde883932c7dd6afaa16a1095f9db1a4))
* **deps:** update dependency helmet to v4.3.1 ([#760](https://github.com/tf2pickup-pl/server/issues/760)) ([1b30cc4](https://github.com/tf2pickup-pl/server/commit/1b30cc4e16a1be5a858cfde16fd84364bb0c1561))

# [3.3.0](https://github.com/tf2pickup-pl/server/compare/3.2.0...3.3.0) (2020-12-23)


### Bug Fixes

* **deps:** update nest monorepo to v7.6.4 ([#756](https://github.com/tf2pickup-pl/server/issues/756)) ([3598ac2](https://github.com/tf2pickup-pl/server/commit/3598ac2716190fd7761e9628d22490663b5c9217))
* get rid of mongoose deprecations ([#755](https://github.com/tf2pickup-pl/server/issues/755)) ([75dede9](https://github.com/tf2pickup-pl/server/commit/75dede9bcbacab5d809cba9e7a2f46655d987fc3))
* **ci:** fix lint.yml ([5797d45](https://github.com/tf2pickup-pl/server/commit/5797d4534c42c86d0f887767d58dc50a290b72de))
* **deps:** update dependency commander to v6.2.1 ([#748](https://github.com/tf2pickup-pl/server/issues/748)) ([02c2c7e](https://github.com/tf2pickup-pl/server/commit/02c2c7e83fe2fbb7cb9d1e341f04b1e3a762104d))
* **deps:** update dependency passport-steam to v1.0.15 ([#750](https://github.com/tf2pickup-pl/server/issues/750)) ([aa2c7bd](https://github.com/tf2pickup-pl/server/commit/aa2c7bd274975b402c3049c9d01adfcd86d150c7))
* **deps:** update nest monorepo to v7.6.3 ([#752](https://github.com/tf2pickup-pl/server/issues/752)) ([985d1ee](https://github.com/tf2pickup-pl/server/commit/985d1ee0f21dbca5d4833c4764cebb1e8e35c9b1))


### Features

* **ci:** move to github actions ([#753](https://github.com/tf2pickup-pl/server/issues/753)) ([44118d2](https://github.com/tf2pickup-pl/server/commit/44118d2d101d0c7d2eaeecea65c850dd916b7c20))
* provide all avatar sizes ([#751](https://github.com/tf2pickup-pl/server/issues/751)) ([0b4cdd7](https://github.com/tf2pickup-pl/server/commit/0b4cdd793ebbceed70c61b4dc573bd70afc87500))

# [3.2.0](https://github.com/tf2pickup-pl/server/compare/3.1.2...3.2.0) (2020-12-10)


### Features

* redirect cookie for auth route ([#745](https://github.com/tf2pickup-pl/server/issues/745)) ([faf5f37](https://github.com/tf2pickup-pl/server/commit/faf5f371d06c37c0668576fd9c877538f2d43c22))

## [3.1.2](https://github.com/tf2pickup-pl/server/compare/3.1.1...3.1.2) (2020-10-11)


### Bug Fixes

* get rid of deprecated decorators ([#650](https://github.com/tf2pickup-pl/server/issues/650)) ([7d7c565](https://github.com/tf2pickup-pl/server/commit/7d7c56545d39267b8d9f4ef63db8888b98297b8f))
* **config:** update environment validation schema ([#649](https://github.com/tf2pickup-pl/server/issues/649)) ([35ceb18](https://github.com/tf2pickup-pl/server/commit/35ceb187680638ede0bc54b0c62d831db44185b1))
* **deps:** update dependency jsonschema to v1.2.10 ([#642](https://github.com/tf2pickup-pl/server/issues/642)) ([431e7f8](https://github.com/tf2pickup-pl/server/commit/431e7f8fdaacea41fdd4675fb5324218b3945b73))
* **deps:** update dependency jsonschema to v1.2.11 ([#647](https://github.com/tf2pickup-pl/server/issues/647)) ([3654ae8](https://github.com/tf2pickup-pl/server/commit/3654ae8a24d89cd5365ffc86c1bd34d9532b8384))
* **deps:** update dependency jsonschema to v1.2.8 ([#637](https://github.com/tf2pickup-pl/server/issues/637)) ([b0a59f6](https://github.com/tf2pickup-pl/server/commit/b0a59f66a77f511f8ab96c8f14b54a5614c33e0f))
* **deps:** update dependency moment to v2.29.1 ([#641](https://github.com/tf2pickup-pl/server/issues/641)) ([f2c2af1](https://github.com/tf2pickup-pl/server/commit/f2c2af1025cc00905d6e3b984b176726463aa7d3))
* **deps:** update dependency mongoose to v5.10.8 ([#639](https://github.com/tf2pickup-pl/server/issues/639)) ([0e51aa9](https://github.com/tf2pickup-pl/server/commit/0e51aa96dfb7de8efdedf5af2cc0e1d6efa810ed))
* **deps:** update dependency mongoose to v5.10.9 ([#646](https://github.com/tf2pickup-pl/server/issues/646)) ([f2ce40a](https://github.com/tf2pickup-pl/server/commit/f2ce40aea8818f646838d10f5acbc99f70872a4e))

## [3.1.1](https://github.com/tf2pickup-pl/server/compare/3.1.0...3.1.1) (2020-09-29)


### Bug Fixes

* get rid of wrong server password ([#631](https://github.com/tf2pickup-pl/server/issues/631)) ([9a0826a](https://github.com/tf2pickup-pl/server/commit/9a0826a61e20d9be51cc345a074b31903d817231))
* **deps:** update dependency @nestjs/schedule to v0.4.1 ([#625](https://github.com/tf2pickup-pl/server/issues/625)) ([1717a84](https://github.com/tf2pickup-pl/server/commit/1717a8417034b3fd1a8b6db0985ba72f15e7afe4))
* **deps:** update dependency @typegoose/typegoose to v7.4.0 ([#616](https://github.com/tf2pickup-pl/server/issues/616)) ([2d1c823](https://github.com/tf2pickup-pl/server/commit/2d1c8235ab8c40d3be35b8c88c3ca6ad8c69413d))
* **deps:** update dependency @typegoose/typegoose to v7.4.1 ([#623](https://github.com/tf2pickup-pl/server/issues/623)) ([d41c1c7](https://github.com/tf2pickup-pl/server/commit/d41c1c76d4696b9a19f81048311d2db3b681b519))
* **deps:** update dependency discord.js to v12.3.1 ([#553](https://github.com/tf2pickup-pl/server/issues/553)) ([b86f613](https://github.com/tf2pickup-pl/server/commit/b86f613aadb47b695ded127d227a06fc845f38c5))
* **deps:** update dependency helmet to v4.1.1 ([#605](https://github.com/tf2pickup-pl/server/issues/605)) ([aa9a498](https://github.com/tf2pickup-pl/server/commit/aa9a498789671e30a9d0aa1aa70504e8dca80a34))
* **deps:** update dependency jsonschema to v1.2.7 ([#630](https://github.com/tf2pickup-pl/server/issues/630)) ([d310eab](https://github.com/tf2pickup-pl/server/commit/d310eab25a5af9598da6234165741d1e5360271f))
* **deps:** update dependency moment to v2.28.0 ([#610](https://github.com/tf2pickup-pl/server/issues/610)) ([ba8eef4](https://github.com/tf2pickup-pl/server/commit/ba8eef49fd200c9a308967f0189378a816d84e29))
* **deps:** update dependency moment to v2.29.0 ([#622](https://github.com/tf2pickup-pl/server/issues/622)) ([38d8520](https://github.com/tf2pickup-pl/server/commit/38d8520559cfddb7131b3a839af2f9bd4997b71f))
* **deps:** update dependency mongoose to v5.10.4 ([#602](https://github.com/tf2pickup-pl/server/issues/602)) ([00e1374](https://github.com/tf2pickup-pl/server/commit/00e13744658dc599f1e485c49e957927da0b7e77))
* **deps:** update dependency mongoose to v5.10.5 ([#607](https://github.com/tf2pickup-pl/server/issues/607)) ([eb67394](https://github.com/tf2pickup-pl/server/commit/eb67394de1a05796a21b060f6d0bb1f58d36df82))
* **deps:** update dependency mongoose to v5.10.6 ([#618](https://github.com/tf2pickup-pl/server/issues/618)) ([33586dd](https://github.com/tf2pickup-pl/server/commit/33586ddd1b54f30e6483800db2961b0f0a8d769a))
* **deps:** update dependency mongoose to v5.10.7 ([#627](https://github.com/tf2pickup-pl/server/issues/627)) ([8f46521](https://github.com/tf2pickup-pl/server/commit/8f46521dc8437a08c7fc57eeaf815f9aa404933a))
* **deps:** update dependency nestjs-console to v3.1.2 ([#613](https://github.com/tf2pickup-pl/server/issues/613)) ([00b01e5](https://github.com/tf2pickup-pl/server/commit/00b01e5df6a375409a1ec524401944a0305b3b80))
* **deps:** update dependency nestjs-typegoose to v7.1.37 ([#603](https://github.com/tf2pickup-pl/server/issues/603)) ([37872fb](https://github.com/tf2pickup-pl/server/commit/37872fbd1c23862977f1787d7ed09bec71182866))
* **deps:** update dependency nestjs-typegoose to v7.1.38 ([#633](https://github.com/tf2pickup-pl/server/issues/633)) ([98c526f](https://github.com/tf2pickup-pl/server/commit/98c526f46b501a33247f1dd7527c4268b0cfb757))
* **deps:** update dependency rcon-client to v4.2.3 ([#626](https://github.com/tf2pickup-pl/server/issues/626)) ([bf72b8b](https://github.com/tf2pickup-pl/server/commit/bf72b8b36d4255200b32adfd7cd46482137f2325))

# [3.1.0](https://github.com/tf2pickup-pl/server/compare/3.0.6...3.1.0) (2020-09-08)


### Bug Fixes

* **deps:** update dependency @nestjs/mongoose to v7.0.2 ([#490](https://github.com/tf2pickup-pl/server/issues/490)) ([1f9dfd3](https://github.com/tf2pickup-pl/server/commit/1f9dfd39655bd6ea51d6b9c3aaf77513318b6ae4))
* **deps:** update dependency @typegoose/typegoose to v7.3.0 ([#495](https://github.com/tf2pickup-pl/server/issues/495)) ([8a75a62](https://github.com/tf2pickup-pl/server/commit/8a75a62fd7ee9e03f3be546527253d0e3508bad9))
* **deps:** update dependency @typegoose/typegoose to v7.3.1 ([#517](https://github.com/tf2pickup-pl/server/issues/517)) ([4eb846b](https://github.com/tf2pickup-pl/server/commit/4eb846ba33f8d16c3c1a64208c5788dd12f4f4ea))
* **deps:** update dependency @typegoose/typegoose to v7.3.2 ([#546](https://github.com/tf2pickup-pl/server/issues/546)) ([07ab08f](https://github.com/tf2pickup-pl/server/commit/07ab08fad6a978eee3306e0cc1f8863845b3dd9a))
* **deps:** update dependency @typegoose/typegoose to v7.3.3 ([#569](https://github.com/tf2pickup-pl/server/issues/569)) ([460a3a9](https://github.com/tf2pickup-pl/server/commit/460a3a98bad8f9c8bf14984c2b217821c7e53f4e))
* **deps:** update dependency @typegoose/typegoose to v7.3.4 ([#575](https://github.com/tf2pickup-pl/server/issues/575)) ([fe0778b](https://github.com/tf2pickup-pl/server/commit/fe0778bb2538fb37563a9a66a56c722d7f9ea74d))
* **deps:** update dependency @typegoose/typegoose to v7.3.5 ([#595](https://github.com/tf2pickup-pl/server/issues/595)) ([01521c5](https://github.com/tf2pickup-pl/server/commit/01521c54d4bc91159d582c81ee830580e08c191f))
* **deps:** update dependency class-transformer to v0.3.1 ([#526](https://github.com/tf2pickup-pl/server/issues/526)) ([826652d](https://github.com/tf2pickup-pl/server/commit/826652d82788d44b135cba1000b57fe2b35e9b21))
* **deps:** update dependency commander to v6 ([#508](https://github.com/tf2pickup-pl/server/issues/508)) ([2d359ee](https://github.com/tf2pickup-pl/server/commit/2d359eeb7108ff840423f68200c27f054826d8ce))
* **deps:** update dependency commander to v6.1.0 ([#577](https://github.com/tf2pickup-pl/server/issues/577)) ([697fa4e](https://github.com/tf2pickup-pl/server/commit/697fa4e07c2e2e2fb50dcee1f7b35fc7a3cfb628))
* **deps:** update dependency helmet to v4 ([#539](https://github.com/tf2pickup-pl/server/issues/539)) ([9aff7a1](https://github.com/tf2pickup-pl/server/commit/9aff7a1e0c751b4817d436454d5439925a0d6382))
* **deps:** update dependency lodash to v4.17.16 ([#489](https://github.com/tf2pickup-pl/server/issues/489)) ([ec4cfb5](https://github.com/tf2pickup-pl/server/commit/ec4cfb5aa951155922d1ca45bf1b5634bb968f29))
* **deps:** update dependency lodash to v4.17.17 ([#491](https://github.com/tf2pickup-pl/server/issues/491)) ([e8b97ac](https://github.com/tf2pickup-pl/server/commit/e8b97aca4812a342c62f25a58dd32026fe82bd97))
* **deps:** update dependency lodash to v4.17.19 ([#493](https://github.com/tf2pickup-pl/server/issues/493)) ([41ed90e](https://github.com/tf2pickup-pl/server/commit/41ed90e8c321d448303d963d4591e4c425dbf75a))
* **deps:** update dependency lodash to v4.17.20 ([#550](https://github.com/tf2pickup-pl/server/issues/550)) ([127b4a2](https://github.com/tf2pickup-pl/server/commit/127b4a2de73cc85fb7fd3462c21a1ab83092c843))
* **deps:** update dependency mongoose to v5.10.0 ([#552](https://github.com/tf2pickup-pl/server/issues/552)) ([841273a](https://github.com/tf2pickup-pl/server/commit/841273a5c2316866debc979ff3bc3ce5a67636f2))
* **deps:** update dependency mongoose to v5.10.1 ([#576](https://github.com/tf2pickup-pl/server/issues/576)) ([985b514](https://github.com/tf2pickup-pl/server/commit/985b51422bd22a2180aa0a2766edd054f698f7c1))
* **deps:** update dependency mongoose to v5.10.2 ([#579](https://github.com/tf2pickup-pl/server/issues/579)) ([1c7e9f8](https://github.com/tf2pickup-pl/server/commit/1c7e9f80062be634c456b4dafa55b04c56e8c92f))
* **deps:** update dependency mongoose to v5.10.3 ([#590](https://github.com/tf2pickup-pl/server/issues/590)) ([0283cc2](https://github.com/tf2pickup-pl/server/commit/0283cc2bb01b0dbb566b2e053dee5cb60582614f))
* **deps:** update dependency mongoose to v5.9.21 ([#480](https://github.com/tf2pickup-pl/server/issues/480)) ([b7af893](https://github.com/tf2pickup-pl/server/commit/b7af8936e24e783e5c7bed761c14509e0451ad67))
* **deps:** update dependency mongoose to v5.9.22 ([#487](https://github.com/tf2pickup-pl/server/issues/487)) ([9d225ee](https://github.com/tf2pickup-pl/server/commit/9d225eed3b8cb3d8d4aa6a6ce4d39bf046a8fc3f))
* **deps:** update dependency mongoose to v5.9.23 ([#499](https://github.com/tf2pickup-pl/server/issues/499)) ([b33e382](https://github.com/tf2pickup-pl/server/commit/b33e382cfd517e674c8990e36d89eeda847409ff))
* **deps:** update dependency mongoose to v5.9.24 ([#501](https://github.com/tf2pickup-pl/server/issues/501)) ([4200740](https://github.com/tf2pickup-pl/server/commit/4200740c74771d3a01222adf3a4256bc037aecc1))
* **deps:** update dependency mongoose to v5.9.25 ([#506](https://github.com/tf2pickup-pl/server/issues/506)) ([7585254](https://github.com/tf2pickup-pl/server/commit/7585254adf424b6124388d6a68214178ad668bb6))
* **deps:** update dependency mongoose to v5.9.26 ([#518](https://github.com/tf2pickup-pl/server/issues/518)) ([a0b78e1](https://github.com/tf2pickup-pl/server/commit/a0b78e1eb40efc7266183ff42c503c236550a5ff))
* **deps:** update dependency mongoose to v5.9.27 ([#533](https://github.com/tf2pickup-pl/server/issues/533)) ([46fcb42](https://github.com/tf2pickup-pl/server/commit/46fcb42cf511697af91ff3be2c00b13d289f6076))
* **deps:** update dependency mongoose to v5.9.28 ([#544](https://github.com/tf2pickup-pl/server/issues/544)) ([6030def](https://github.com/tf2pickup-pl/server/commit/6030def201725cfe8fc9a35e4ea4bf095f687e1d))
* **deps:** update dependency mongoose to v5.9.29 ([#551](https://github.com/tf2pickup-pl/server/issues/551)) ([3cfa866](https://github.com/tf2pickup-pl/server/commit/3cfa8664c697038a7ee88e94903749990b478811))
* **deps:** update dependency nestjs-console to v3.1.1 ([#528](https://github.com/tf2pickup-pl/server/issues/528)) ([2a94a25](https://github.com/tf2pickup-pl/server/commit/2a94a25c8b1838e92918421e483f1035e7bc4c21))
* **deps:** update dependency nestjs-typegoose to v7.1.29 ([#524](https://github.com/tf2pickup-pl/server/issues/524)) ([191c596](https://github.com/tf2pickup-pl/server/commit/191c5961ac6ea50bf96dcb9128eba0c2152a5f21))
* **deps:** update dependency nestjs-typegoose to v7.1.30 ([#525](https://github.com/tf2pickup-pl/server/issues/525)) ([3619bb8](https://github.com/tf2pickup-pl/server/commit/3619bb8f16dda3af140cae18669717e3d1a3e6c8))
* **deps:** update dependency nestjs-typegoose to v7.1.31 ([#536](https://github.com/tf2pickup-pl/server/issues/536)) ([f6b017b](https://github.com/tf2pickup-pl/server/commit/f6b017bdf32481bbe5ef4e2e0645829b5b42cdd7))
* **deps:** update dependency nestjs-typegoose to v7.1.32 ([#537](https://github.com/tf2pickup-pl/server/issues/537)) ([d8e018c](https://github.com/tf2pickup-pl/server/commit/d8e018cbd800555fcd0bb1b52cac9218925a6b92))
* **deps:** update dependency nestjs-typegoose to v7.1.33 ([#580](https://github.com/tf2pickup-pl/server/issues/580)) ([4929968](https://github.com/tf2pickup-pl/server/commit/4929968883f095fad4cbfe0f1a2a05b988f3938b))
* **deps:** update dependency nestjs-typegoose to v7.1.34 ([#581](https://github.com/tf2pickup-pl/server/issues/581)) ([77fde6c](https://github.com/tf2pickup-pl/server/commit/77fde6cbf19b4583745485b8e00a92d2e1cf6562))
* **deps:** update dependency nestjs-typegoose to v7.1.35 ([#591](https://github.com/tf2pickup-pl/server/issues/591)) ([e25907c](https://github.com/tf2pickup-pl/server/commit/e25907c42e73f86f9546d06b6077da6c4ee037ae))
* **deps:** update dependency nestjs-typegoose to v7.1.36 ([#593](https://github.com/tf2pickup-pl/server/issues/593)) ([8571e79](https://github.com/tf2pickup-pl/server/commit/8571e793b2512db3ce85e5d1390aec2e25745aa2))
* **deps:** update dependency rcon-client to v4.2.1 ([#514](https://github.com/tf2pickup-pl/server/issues/514)) ([3cecfa7](https://github.com/tf2pickup-pl/server/commit/3cecfa73728cff3bc9d5f17af32721e223dddbfa))
* **deps:** update dependency rcon-client to v4.2.2 ([#538](https://github.com/tf2pickup-pl/server/issues/538)) ([6f90b8d](https://github.com/tf2pickup-pl/server/commit/6f90b8d0c8efc9d54aef9856b7b3ee6576a275ac))
* **deps:** update dependency rxjs to v6.6.0 ([#481](https://github.com/tf2pickup-pl/server/issues/481)) ([d77e65a](https://github.com/tf2pickup-pl/server/commit/d77e65a2dad5a3396ad7754aaaadee3670b33c08))
* **deps:** update dependency rxjs to v6.6.2 ([#530](https://github.com/tf2pickup-pl/server/issues/530)) ([924facf](https://github.com/tf2pickup-pl/server/commit/924facfe62c372e1a21449a966ce3ae60277920e))
* **deps:** update dependency rxjs to v6.6.3 ([#596](https://github.com/tf2pickup-pl/server/issues/596)) ([895e6eb](https://github.com/tf2pickup-pl/server/commit/895e6eb1ac5b2b5b2efb4e442dbf739221933361))
* **deps:** update nest monorepo to v7.3.0 ([#478](https://github.com/tf2pickup-pl/server/issues/478)) ([4e83367](https://github.com/tf2pickup-pl/server/commit/4e83367c0f1072b8d91387950fca9371bc197d13))
* **deps:** update nest monorepo to v7.3.1 ([#482](https://github.com/tf2pickup-pl/server/issues/482)) ([5bed50c](https://github.com/tf2pickup-pl/server/commit/5bed50cbc532c0a639738102b6bad5fc3cb00867))
* **deps:** update nest monorepo to v7.3.2 ([#492](https://github.com/tf2pickup-pl/server/issues/492)) ([f29a562](https://github.com/tf2pickup-pl/server/commit/f29a5624e932ff59170ad7e1ac37654561c9e832))
* **deps:** update nest monorepo to v7.4.0 ([#522](https://github.com/tf2pickup-pl/server/issues/522)) ([fba9903](https://github.com/tf2pickup-pl/server/commit/fba99033f99c43f6e0ddf8c98cb1ad0d1802eecd))
* **deps:** update nest monorepo to v7.4.1 ([#523](https://github.com/tf2pickup-pl/server/issues/523)) ([3416b71](https://github.com/tf2pickup-pl/server/commit/3416b71f832a1a4df43974898326d5782e56f960))
* **deps:** update nest monorepo to v7.4.2 ([#529](https://github.com/tf2pickup-pl/server/issues/529)) ([902a27e](https://github.com/tf2pickup-pl/server/commit/902a27ec94e95b63a3b54e86d9c84d6b0fa4d868))
* fix issue urls in readme ([e9ca314](https://github.com/tf2pickup-pl/server/commit/e9ca314c33b2a65233ac8149110372b8b88d2449))


### Features

* **games:** add the /games/?playerId=<playerId> endpoint ([#470](https://github.com/tf2pickup-pl/server/issues/470)) ([924b424](https://github.com/tf2pickup-pl/server/commit/924b42471bad70bdcfee8e14d05a44b8e34404c9))
* **players:** add bot user ([#483](https://github.com/tf2pickup-pl/server/issues/483)) ([7304418](https://github.com/tf2pickup-pl/server/commit/7304418ad6f8be999576d9d9714546dc3e97529d))

## [3.0.6](https://github.com/tf2pickup-pl/server/compare/3.0.5...3.0.6) (2020-06-30)


### Bug Fixes

* **deps:** update dependency @nestjs/passport to v7.1.0 ([#473](https://github.com/tf2pickup-pl/server/issues/473)) ([9ccc4da](https://github.com/tf2pickup-pl/server/commit/9ccc4da97c983d469a7542363d433459afa56fff))
* **deps:** update dependency helmet to v3.23.2 ([#463](https://github.com/tf2pickup-pl/server/issues/463)) ([0e1d193](https://github.com/tf2pickup-pl/server/commit/0e1d193789279e184b124291dc9fe7aad6e62732))
* **deps:** update dependency helmet to v3.23.3 ([#471](https://github.com/tf2pickup-pl/server/issues/471)) ([19d2dd9](https://github.com/tf2pickup-pl/server/commit/19d2dd92d287a7a193680252681e03de80711c1f))
* **deps:** update dependency migrate to v1.7.0 ([#475](https://github.com/tf2pickup-pl/server/issues/475)) ([18324a2](https://github.com/tf2pickup-pl/server/commit/18324a20a63abb4a1f98d12309be03c859fd2e46))
* **deps:** update dependency mongoose to v5.9.20 ([#462](https://github.com/tf2pickup-pl/server/issues/462)) ([059ab69](https://github.com/tf2pickup-pl/server/commit/059ab698ea65d2d5a5204330d39f8bca347618a1))
* **players:** ignore TF2 in-game hours verification failure when the verification is not needed ([#477](https://github.com/tf2pickup-pl/server/issues/477)) ([ae2ffc4](https://github.com/tf2pickup-pl/server/commit/ae2ffc4f9d664a245aff39f317cb676652ffae13))

## [3.0.5](https://github.com/tf2pickup-pl/server/compare/3.0.4...3.0.5) (2020-06-22)


### Bug Fixes

* **deps:** update dependency @nestjs/serve-static to v2.1.3 ([#460](https://github.com/tf2pickup-pl/server/issues/460)) ([5ae17dd](https://github.com/tf2pickup-pl/server/commit/5ae17dda7b3cb084b330c8b3f51dc2a5201f0f12))
* **deps:** update dependency moment to v2.27.0 ([#454](https://github.com/tf2pickup-pl/server/issues/454)) ([90af439](https://github.com/tf2pickup-pl/server/commit/90af439237f83be68f4812e1f4e107a1d4795b26))
* **games:** prevent team overrides from eliminating all possible lineups ([#461](https://github.com/tf2pickup-pl/server/issues/461)) ([d5aaf54](https://github.com/tf2pickup-pl/server/commit/d5aaf540841b63f4629a476d281fadb304f92703))

## [3.0.4](https://github.com/tf2pickup-pl/server/compare/3.0.3...3.0.4) (2020-06-19)


### Bug Fixes

* capture uploaded demo url ([#455](https://github.com/tf2pickup-pl/server/issues/455)) ([cde2a39](https://github.com/tf2pickup-pl/server/commit/cde2a3976ddc11df26e58592e387e89dedf7361e))

## [3.0.3](https://github.com/tf2pickup-pl/server/compare/3.0.2...3.0.3) (2020-06-18)


### Bug Fixes

* fix GameServer not being saved after assigning a game ([#453](https://github.com/tf2pickup-pl/server/issues/453)) ([ef30ffd](https://github.com/tf2pickup-pl/server/commit/ef30ffd05f11fdc5f0b74b4fcd08f05bc0156ea8))

## [3.0.2](https://github.com/tf2pickup-pl/server/compare/3.0.1...3.0.2) (2020-06-18)


### Bug Fixes

* fix recursive game server assignment ([#452](https://github.com/tf2pickup-pl/server/issues/452)) ([ab08f22](https://github.com/tf2pickup-pl/server/commit/ab08f22e7aa33b5bd4ea302d8039bb47a07bab26))
* **deps:** update dependency nestjs-typegoose to v7.1.28 ([#449](https://github.com/tf2pickup-pl/server/issues/449)) ([af9de32](https://github.com/tf2pickup-pl/server/commit/af9de3207fec4a4f7667b113493743f6cf12deda))

## [3.0.1](https://github.com/tf2pickup-pl/server/compare/3.0.0...3.0.1) (2020-06-18)


### Bug Fixes

* fix hall of fame reporting ([#445](https://github.com/tf2pickup-pl/server/issues/445)) ([15780b7](https://github.com/tf2pickup-pl/server/commit/15780b779153b1fad714970b74815ab876d23f25))

# [3.0.0](https://github.com/tf2pickup-pl/server/compare/2.9.1...3.0.0) (2020-06-17)


### Bug Fixes

* delete discord announcement when player is subbing himself ([#441](https://github.com/tf2pickup-pl/server/issues/441)) ([5c0fa5c](https://github.com/tf2pickup-pl/server/commit/5c0fa5c6e8a4538286491743f9d436aa3d90ae4a))
* emit updated Game objects on game events ([#443](https://github.com/tf2pickup-pl/server/issues/443)) ([5ce71e8](https://github.com/tf2pickup-pl/server/commit/5ce71e8d5a917dfa576606d3721bcca0cef45cd9))
* **deps:** update dependency helmet to v3.23.1 ([#440](https://github.com/tf2pickup-pl/server/issues/440)) ([0e59897](https://github.com/tf2pickup-pl/server/commit/0e598977f55446d4bc3a5b01327a36125d8ff4cf))
* Game model migration ([#439](https://github.com/tf2pickup-pl/server/issues/439)) ([2898e76](https://github.com/tf2pickup-pl/server/commit/2898e76458b993f7172c14eb81159f4ee1729332))
* **deps:** update dependency mongoose to v5.9.19 ([#438](https://github.com/tf2pickup-pl/server/issues/438)) ([896aac5](https://github.com/tf2pickup-pl/server/commit/896aac5fbf5aadc9e58049b19fe6c3e10030c38b))
* ignore .migrate ([0a6d4e2](https://github.com/tf2pickup-pl/server/commit/0a6d4e29e5297af8ad2df8261b02a1f207e4aa55))
* update GamePlayer & Game indexes ([8532f26](https://github.com/tf2pickup-pl/server/commit/8532f269b46e672cf21028993d41cf2e5bebe7cc))
* **deps:** pin dependency migrate to 1.6.2 ([#435](https://github.com/tf2pickup-pl/server/issues/435)) ([fff3e9c](https://github.com/tf2pickup-pl/server/commit/fff3e9c59f0899d519ed18833c7e8ce5d4658da2))


### Code Refactoring

* get rid of Game.players ([#437](https://github.com/tf2pickup-pl/server/issues/437) ([1a9b759](https://github.com/tf2pickup-pl/server/commit/1a9b759fa0156a82cbbba2335a112cdf2dffdf13))
* update Game model to use team names ([#434](https://github.com/tf2pickup-pl/server/issues/434)) ([3fae9ca](https://github.com/tf2pickup-pl/server/commit/3fae9caec26d04c49bbb0cb61b147748a7856b24))


### BREAKING CHANGES

* Game.players is gone, GamePlayer.playerId is renamed to GamePlayer.player
* Game.teams is now gone, GamePlayer.teamId is moved to GamePlayer.team

## [2.9.1](https://github.com/tf2pickup-pl/server/compare/2.9.0...2.9.1) (2020-06-13)


### Bug Fixes

* re-enable default helmet middleware ([ada5cf2](https://github.com/tf2pickup-pl/server/commit/ada5cf2890b99f804b14cff95678d182ab3cfeac))

# [2.9.0](https://github.com/tf2pickup-pl/server/compare/2.8.1...2.9.0) (2020-06-13)


### Bug Fixes

* **deps:** update dependency helmet to v3.23.0 ([#430](https://github.com/tf2pickup-pl/server/issues/430)) ([dfbbd9a](https://github.com/tf2pickup-pl/server/commit/dfbbd9a9ceb6d867ccf27db97ad1a3a00bc09653))
* handle missing discord guild ([#432](https://github.com/tf2pickup-pl/server/issues/432)) ([e0b229c](https://github.com/tf2pickup-pl/server/commit/e0b229ca2c97b6f3c2ca0ee13b9f57c30e19a7a5))


### Features

* add CSP headers ([#431](https://github.com/tf2pickup-pl/server/issues/431)) ([fac778e](https://github.com/tf2pickup-pl/server/commit/fac778edf2a7166a0a7b57836ed6e7c0041e4c3a))

## [2.8.1](https://github.com/tf2pickup-pl/server/compare/2.8.0...2.8.1) (2020-06-12)


### Bug Fixes

* **discord:** send actual embeds ([#429](https://github.com/tf2pickup-pl/server/issues/429)) ([64f75ab](https://github.com/tf2pickup-pl/server/commit/64f75ab0433b1ba58e35dc1fc5d4bc53a17a2e9e))

# [2.8.0](https://github.com/tf2pickup-pl/server/compare/2.7.0...2.8.0) (2020-06-12)


### Bug Fixes

* **deps:** update dependency helmet to v3.22.1 ([#421](https://github.com/tf2pickup-pl/server/issues/421)) ([1fe29fa](https://github.com/tf2pickup-pl/server/commit/1fe29fa14dceef453bf6390da6cfb7b6c7bbfe92))


### Features

* **discord:** add admin responsible field for discord admin notifications ([#427](https://github.com/tf2pickup-pl/server/issues/427)) ([dc7634f](https://github.com/tf2pickup-pl/server/commit/dc7634f17eb2a0af36373b8a2dbc4f359fd622a7))
* **discord:** add server started notification ([#428](https://github.com/tf2pickup-pl/server/issues/428)) ([765b4df](https://github.com/tf2pickup-pl/server/commit/765b4dfc47adaa9b30d031ce3adfdaf04b3895c3))
* **discord:** delete substitute request msgsWhen the substitute request is canceled or resolved delete the discordannouncement. ([#426](https://github.com/tf2pickup-pl/server/issues/426)) ([72415cf](https://github.com/tf2pickup-pl/server/commit/72415cfa965eae5ead4f01b7f687b627d740a3f9))

# [2.7.0](https://github.com/tf2pickup-pl/server/compare/2.6.3...2.7.0) (2020-06-10)


### Bug Fixes

* ignore match start after it has been ended ([#422](https://github.com/tf2pickup-pl/server/issues/422)) ([b6e2958](https://github.com/tf2pickup-pl/server/commit/b6e29580ace014a223867842521bbaa1c304313d))
* **deps:** update dependency nestjs-console to v3.0.6 ([#420](https://github.com/tf2pickup-pl/server/issues/420)) ([147fcbd](https://github.com/tf2pickup-pl/server/commit/147fcbd6c3ffe8028939163bd3c214f67c29e4be))


### Features

* **ci:** add release-it support ([aafcdfb](https://github.com/tf2pickup-pl/server/commit/aafcdfb50c0d56c21e532d25c991fedf0a591185))

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