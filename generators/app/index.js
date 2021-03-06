'use strict';

const generators = require('yeoman-generator');
const fs         = require('fs');


module.exports = generators.Base.extend({
	constructor: function () {
		generators.Base.apply(this, arguments);
	},
	prompting  : {
		appName            : function () {

			var prompt = [{
				type   : 'input',
				name   : 'appName',
				message: 'Enter app name (default: my-service)'
			}];

			return this.prompt(prompt).then(function (response) {
				this.options.appName = response.appName || "my-service";
			}.bind(this));
		},
		database           : function () {

			var prompt = [{
				type   : 'list',
				name   : 'database',
				message: 'Select a database to use:',
				choices: [
					'None',
					'MongoDB',
					'RethinkDB'
				],
				store  : true
			}];

			return this.prompt(prompt).then(function (response) {
				this.options.database = response.database.toLowerCase();
			}.bind(this));
		},
		view               : function () {

			var prompt = [{
				type   : 'confirm',
				name   : 'view',
				message: 'Will your service include UI (html, css ...)?'
			}];

			return this.prompt(prompt).then(function (response) {
				this.options.view = response.view;
			}.bind(this));
		},
		eslint             : function () {

			var prompt = [{
				type   : 'confirm',
				name   : 'eslint',
				message: 'Do you want to use ESLint?'
			}];

			return this.prompt(prompt).then(function (response) {
				this.options.eslint = response.eslint;
			}.bind(this));
		},
		docker             : function () {

			const prompt = [{
				type   : 'confirm',
				name   : 'docker',
				message: 'Do you want to use Docker?'
			}];

			return this.prompt(prompt).then(function (response) {
				this.options.docker = response.docker;
			}.bind(this));
		},
		pm2                : function () {
			const prompt = [{
				type   : 'confirm',
				name   : 'pm2',
				message: 'Do you want to use pm2?'
			}];

			return this.prompt(prompt).then(function (response) {
				this.options.pm2 = response.pm2;
			}.bind(this));
		},
		installDependencies: function () {

			const prompt = [{
				type   : 'confirm',
				name   : 'installDependencies',
				message: 'Do you want to install dependencies?'
			}];

			return this.prompt(prompt).then(function (response) {
				this.options.installDependencies = response.installDependencies;
			}.bind(this));
		}
	},
	writing    : {
		buildEnv  : function () {

			// create directory
			this.destinationRoot(this.options.appName);

			copyServiceFiles.call(this);
			copyViewFiles.call(this, this.options.view);
			copyDbFiles.call(this, this.options.database);
			copyConfigFiles.call(this, this.options);
			copyDocker.call(this, this.options.docker);
			copyPm2.call(this, this.options.pm2, this.options.appName);
			copyLint.call(this, this.options.eslint);
			copyPackageJson.call(this, this.options);

		},
		assetsDirs: function () {
		}
	},
	install    : function () {
		if (this.options.installDependencies) {
			this.installDependencies();
		}
	}
});

function copyDocker(dockerOptions) {
	if (dockerOptions) {
		this.fs.copy(
			this.templatePath('docker'),
			this.destinationPath('')
		);
		this.fs.copy(
			this.templatePath('docker/.dockerignore'),
			this.destinationPath('.dockerignore')
		);
	}
}

function copyServiceFiles() {
	this.fs.copy(
		this.templatePath('index.js'),
		this.destinationPath('index.js')
	);
	this.fs.copy(
		this.templatePath('shared'),
		this.destinationPath('lib')
	);
	this.fs.copy(
		this.templatePath('tests'),
		this.destinationPath('tests')
	);
}

function copyViewFiles(viewOptions) {
	if (viewOptions) {
		this.fs.copy(
			this.templatePath('view/public'),
			this.destinationPath('public')
		);
		this.fs.copy(
			this.templatePath('view/templates'),
			this.destinationPath('templates')
		);
		this.fs.copyTpl(
			this.templatePath('infrastructure/hapi/extentions.js'),
			this.destinationPath('lib/infrastructure/hapi/extentions.js'), {
				extentions        : '\n' + fs.readFileSync(this.templatePath('infrastructure/hapi/extentions-with-view.js')),
				additionalRequired: 'const path                 = require(\'path\');' + '\n'
			}
		);
		this.fs.copyTpl(
			this.templatePath('server.js'),
			this.destinationPath('lib/server.js'), {
				viewRoutes: '\n\t\t\t' + '.then(() => hapiExtensions.addViewsRoutesPlugin(apiConnection))'
			}
		);
	} else {
		this.fs.copyTpl(
			this.templatePath('infrastructure/hapi/extentions.js'),
			this.destinationPath('lib/infrastructure/hapi/extentions.js'), {
				extentions        : '',
				additionalRequired: ''
			}
		);
		this.fs.copyTpl(
			this.templatePath('server.js'),
			this.destinationPath('lib/server.js'), {
				viewRoutes: ''
			}
		);
	}
}

function copyConfigFiles(options) {
	this.fs.copy(
		this.templatePath('config/default.json'),
		this.destinationPath('config/default.json')
	);

	if (options.database === 'none') {
		this.fs.copy(
			this.templatePath('config/development-in-memory.json'),
			this.destinationPath('config/development.json')
		);
		this.fs.copy(
			this.templatePath('config/prod-in-memory.json'),
			this.destinationPath('config/prod.json')
		);
	}

	if (options.database === 'rethinkdb') {
		this.fs.copy(
			this.templatePath('config/development-rethinkdb.json'),
			this.destinationPath('config/development.json')
		);
		this.fs.copy(
			this.templatePath('config/prod-rethinkdb.json'),
			this.destinationPath('config/prod.json')
		);
	}

	if (options.database === 'mongodb') {
		this.fs.copy(
			this.templatePath('config/development-mongodb.json'),
			this.destinationPath('config/development.json')
		);
		this.fs.copy(
			this.templatePath('config/prod-mongodb.json'),
			this.destinationPath('config/prod.json')
		);
	}
}

function copyDbFiles(dbOptions) {
	if (dbOptions === 'none') {
		this.fs.copy(
			this.templatePath('data/in-memory.js'),
			this.destinationPath('lib/data/index.js')
		);
		this.fs.copy(
			this.templatePath('data/in-memory-product.js'),
			this.destinationPath('lib/data/Product.js')
		);
	}

	if (dbOptions === 'rethinkdb') {
		this.fs.copy(
			this.templatePath('data/rethinkdb.js'),
			this.destinationPath('lib/data/index.js')
		);
		this.fs.copy(
			this.templatePath('data/rethinkdb-helpers.js'),
			this.destinationPath('lib/data/dbHelpers.js')
		);
		this.fs.copy(
			this.templatePath('data/rethinkdb-product.js'),
			this.destinationPath('lib/data/Product.js')
		);
	}

	if (dbOptions === 'mongodb') {
		this.fs.copy(
			this.templatePath('data/mongodb.js'),
			this.destinationPath('lib/data/index.js')
		);
		this.fs.copy(
			this.templatePath('data/mongodb-product.js'),
			this.destinationPath('lib/data/Product.js')
		);
	}
}

function copyPm2(pm2Options, appName) {
	if (pm2Options) {
		this.fs.copyTpl(
			this.templatePath('pm2/ecosystem.json'),
			this.destinationPath('ecosystem.json'), {
				app_name: appName
			}
		);
	}
}

function copyLint(lintOptions) {
	if (lintOptions) {
		this.fs.copy(
			this.templatePath('eslint/.eslintignore'),
			this.destinationPath('.eslintignore')
		);
		this.fs.copy(
			this.templatePath('eslint/.eslintrc.json'),
			this.destinationPath('.eslintrc.json')
		);
	}
}

function copyPackageJson(options) {
	let lintPackages = '';
	if (options.eslint) {
		lintPackages = '\"eslint\": \"^3.10.2\",' + '\n' + '    \"eslint-config-airbnb\": \"^13.0.0\",' + '\n' + '    \"eslint-plugin-react\": \"^6.7.1\",\n    ';
	}

	let dbPackages = '';
	if (options.database === 'mongodb') {
		dbPackages = '\n' + '    \"mongoose\": \"^4.7.1\",'
	}

	if (options.database === 'rethinkdb') {
		dbPackages = '\n' + '    \"rethinkdbdash\": \"2.2.18\",'
	}

	let viewPackages = '';
	if (options.view) {
		viewPackages = '\n' + '    \"handlebars\": \"^4.0.6\",'
	}

	this.fs.copyTpl(
		this.templatePath('package.json'),
		this.destinationPath('package.json'), {
			lint    : lintPackages,
			db      : dbPackages,
			app_name: options.appName,
			view    : viewPackages
		}
	);
}