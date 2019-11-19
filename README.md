# UOS Score Bot for Telegram

[![Build Status](https://travis-ci.org/UOSnetwork/uos.score.bot.svg?branch=master)](https://travis-ci.org/UOSnetwork/uos.score.bot)
![GitHub package.json version](https://img.shields.io/github/package-json/v/UOSnetwork/uos.score.bot)
![GitHub](https://img.shields.io/github/license/UOSnetwork/uos.score.bot)

This bot can show both Social and Importance° rates for any account of UOS° Network. Also, anyone can link their telegram account to their UOS° account to query any linked telegram accounts for rates.   

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project for production uses.

### Prerequisites

First of all, you need to create Telegram bot with the help of [@BotFather](https://t.me/BotFather). 

[BotFater Documentation](https://core.telegram.org/bots#6-botfather). 

You need your bot `token` from BotFather.

### Installing

Clone the repository 

```
git clone https://github.com/UOSnetwork/uos-score-bot.git
```

Create a `.env` file from `env.sample` and replace placeholders with actual values

```
NODE_ENV=development
TOKEN=<TELEGRAM BOT TOKEN> - Put your bot token here
AUTH_USER_ID=<TELEGRAM USER ID> - Your telegram account ID (It's not used atm, so you can put any number)
DATABASE_URL=<PG DB URL> - PostgreSQL database connection URL, more on this later
...
```

This bot uses a PostgreSQL database to store linked account data, there is a sample file to create the scheme.
```
DROP TABLE public.tbl_accounts;

CREATE TABLE public.tbl_accounts
(
    tg_uid bigint NOT NULL,
    tg_name character varying(255),
    uos_name character varying(12) NOT NULL,
    last_updated timestamp without time zone,
    CONSTRAINT tbl_accounts_pkey PRIMARY KEY (tg_uid)
)
```

Then you can proceed with
```
npm install
```

### Running the bot

To start the bot run
```
node bot
```

## How to use the bot
You can use the bot using the following commands:
```
/link <UOS account name> - Links your telegram account to specified UOS account
```
```
/unlink - Unlinks your telegram account from any linked UOS accounts
```
```
/check <Telegram/UOS account name> - Check the score of any telegram account (starting with @) or UOS account, sending this command without arguments shows your own score
```

## Deployment

For production, you can deploy it on Heroku or any other similar service. There is [Procfile](Procfile) for the Heroku worker.

## Built With

* [Telegraf](https://telegraf.js.org/) - Modern Telegram Bot Framework for Node.js
* [Knex](http://knexjs.org/) - A SQL Query Builder for Javascript
* [EOSJS](https://github.com/EOSIO/eosjs/) - General purpose library for the EOS blockchain.

## Contributing

Please read [CONTRIBUTING.md](../../../uos.docs/blob/master/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Help

- [Author](https://t.me/myx0m0p)

- [UOS Network Developers Chat](https://t.me/uos_developers)

- [UOS Network General Chat](https://t.me/uos_network_en)

- [Bot Community](https://u.community/communities/245)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
