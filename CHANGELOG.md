# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.5.0](https://github.com/alberto-leon-crespo/newsbucket-injestor/compare/v1.4.0...v1.5.0) (2023-09-24)


### Features

* added newtral reader to enpower database fake news table ([b9e0520](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/b9e05200093f95cfd9aa064547283cf6ae8fad0e))

## [1.4.0](https://github.com/alberto-leon-crespo/newsbucket-injestor/compare/v1.3.0...v1.4.0) (2023-09-22)


### Features

* added country and type to feeds bigquery table export ([34d7903](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/34d7903c3ae8683e9b1aef461e617833aecd8a9c))
* added export feeds script ([5c3d496](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/5c3d496a5411bcfd6d5d10899206270eaef61ded))
* added script to update feeds with country and type reading media collection ([1d18490](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/1d18490d484acc371e0037d932172397a8cb593b))
* updated feed schema to include country and type ([4496f23](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/4496f23b8e88071c26d2806615b49b5f88f13c7f))

## [1.3.0](https://github.com/alberto-leon-crespo/newsbucket-injestor/compare/v1.2.1...v1.3.0) (2023-09-20)


### Features

* Added script to  daily export fake-news to bigquery. Last modificacitions to export-news script to best handling of files. ([db95301](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/db95301c576cace4f754a80bfd9b5bfbdac5c18a))
* added script to daily export news to bigquery ([f7254f6](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/f7254f6f0b4d6dcc2641db32e22404056fb5550e))
* added script to extract metadata from news images ([4aecb4a](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/4aecb4a9f2fff7b1f2033d9bee55e40578dae763))


### Bug Fixes

* reduced chunk size to prevent cursor timeout error ([d720184](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/d72018439749e9c811973e14cd72f0d0e1d08017))

### [1.2.1](https://github.com/alberto-leon-crespo/newsbucket-injestor/compare/v1.2.0...v1.2.1) (2023-08-12)


### Bug Fixes

* modified mongoose module to prevent process.env read error ([ef897f5](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/ef897f59e07c7cc98ee03fc119094e8e61ecc8fd))

## [1.2.0](https://github.com/alberto-leon-crespo/newsbucket-injestor/compare/v1.1.0...v1.2.0) (2023-08-12)


### Features

* added dotenv to manage config and .env files ([ba6a56c](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/ba6a56ca237cdbb5d8630458d3e5f616f3cf852c))

## 1.1.0 (2023-08-12)


### Features

* added fact-check tool reader for google ([c2cbef3](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/c2cbef3f5181b75e5783ba157849411ce706b0ab))
* added script to make export of news to csv ([ca5bb7f](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/ca5bb7ff110cb311139c7c2699635ceffa1ee198))


### Bug Fixes

* added process.exit to ensure process close after end ([1fed50d](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/1fed50d71704e8e88471802effb255530195ecc7))
* modified chunk size to fasted testing ([03987db](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/03987db96a6b4195e42c0720c3600092b3499ad9))
* modified export to write to temp.csv ([93af778](https://github.com/alberto-leon-crespo/newsbucket-injestor/commit/93af7782391b2323574060bcf00fa1bbf4f25fb0))
