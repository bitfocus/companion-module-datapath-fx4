// Datapath FX4

var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions();

	return self;
};


/**
 * Config updated by the user.
 */
instance.prototype.updateConfig = function(config) {
	var self = this;
	self.config = config;
};


/**
 * Initializes the module.
 */
instance.prototype.init = function() {
	var self = this;

	self.status(self.STATE_OK);

	debug = self.debug;
	log = self.log;
};


/**
 * Return config fields for web config.
 */
instance.prototype.config_fields = function() {
	var self = this;

	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will control a Datapath FX4.'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 4,
			regex: self.REGEX_IP
		}
	];

};


/**
 * Cleanup when the module gets deleted.
 */
instance.prototype.destroy = function() {
	var self = this;
	debug("destroy");
};


/**
 * Populates the supported actions.
 */
instance.prototype.actions = function(system) {
	var self = this;

	self.setActions({
		'preferred_input': {
			label: 'Preferred Input',
			options: [
				{
					type: 'dropdown',
					label: 'Input Number',
					id: 'input',
					default: '2',
					choices: [
						{ id: '0', label: 'Input 1'},
						{ id: '1', label: 'Input 2'},
						{ id: '2', label: 'Input 3'}
					]
				}
			]
		},

		'reboot': {
			label: 'Reboot Device'
		}

	});
};


/**
 * Retrieves information via GET and returns a Promise.
 *
 * @param cmd           The command to execute
 * @return              A Promise that's resolved after the GET.
 */
instance.prototype.getRest = function(cmd, body) {
	var self = this;
	return self.doRest('GET', cmd, body);
};


/**
 * Requests/Retrieves information via POST and returns a Promise.
 *
 * @param cmd           The command to execute
 * @param body          The body of the POST; an object.
 * @return              A Promise that's resolved after the POST.
 */
instance.prototype.postRest = function(cmd, body) {
	var self = this;
	return self.doRest('POST', cmd, body);
};


/**
 * Performs the REST command, either GET or POST.
 *
 * @param method        Either GET or POST
 * @param cmd           The command to execute
 * @param body          If POST, an object containing the POST's body
 */
instance.prototype.doRest = function(method, cmd, body) {
	var self = this;
	var url  = self.makeUrl(cmd);

	return new Promise(function(resolve, reject) {

		function handleResponse(err, result) {
			if (err === null && typeof result === 'object' && result.response.statusCode === 200) {
				// A successful response

				var objJson = {};
				if (result.data.length > 0) {
					try {
						objJson = JSON.parse(result.data.toString());
					} catch(error) { }
				}
				resolve(objJson);

			} else {
				// Failure. Reject the promise.
				var message = 'Unknown error';

				if (result !== undefined) {
					if (result.response !== undefined) {
						message = result.response.statusCode + ': ' + result.response.statusMessage;
					} else if (result.error !== undefined) {
						// Get the error message from the object if present.
						message = result.error.code +': ' + result.error.message;
					}
				}

				reject(message);
			}
		}

		var headers = { };

		switch(method) {
			case 'POST':
				self.system.emit('rest', url, body, function(err, result) {
						handleResponse(err, result);
					}, headers, extra_args
				);
				break;

			case 'GET':
				self.system.emit('rest_get', url, function(err, result) {
						handleResponse(err, result);
					}, headers, extra_args
				);
				break;

			default:
				throw new Error('Invalid method');

		}

	});

};


/**
 * Runs the specified action.
 *
 * @param action
 */
instance.prototype.action = function(action) {
	var self = this;
	var opt = action.options;

	try {
		switch (action.action) {
			case 'preferred_input':
				self.doCommand('/PreferredInput.cgx', { "Input": parseInt(opt.input)});
				break;
			case 'reboot':
				self.doCommand('/RebootDevice.cgx', {});
				break;
		}

	} catch (err) {
		self.log('error', err.message);
	}
};

/**
 * Runs the [POST] command.
 *
 * @param cmd           The command the run. Must start with '/'
 * @param body          The body of the POST content
 */
instance.prototype.doCommand = function(cmd, body) {
	var self = this;
	body = body || {};

	self.postRest(cmd, body).then(function(objJson) {
		// Success
	}).catch(function(message) {
		self.log('error', self.config.host + ' : ' + message);
	});
};

/**
 * Makes the complete URL.
 *
 * @param cmd           Must start with a /
 */
instance.prototype.makeUrl = function(cmd) {
	var self = this;

	if (cmd[0] !== '/') {
		throw new Error('cmd must start with a /');
	}

	return 'http://' + self.config.host + cmd;
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
