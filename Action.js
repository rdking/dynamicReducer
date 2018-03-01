function createAction(scope, type, payload) {
	var retval = {};
	function getter(key) {
		return () => payload[key];
	}

	Object.defineProperties(retval, {
		scope: {
			enumerable: true,
			get: () => scope
		},
		type: {
			enumerable: true,
			get: () => type
		},
		payload: {
			enumerable: true,
			value: {}
		}
	});

	for (var key in payload) {
		Object.defineProperty(retval.payload, key, {
			enumerable: true,
			get: getter(key)
		});
	}
	
	return retval;
}

const createTypedActionCreator = (scope, type, fields) => {
	if  ((typeof(type) !== 'string') || !type.length) {
		throw new TypeError("createTypedActionCreator: Parameter 'type' must be a string!");
	}

	fields = fields || [];

	var params = fields.join(', ');
	return eval(`((${fields}) => {\n\
		var payload = { ${fields} };\n\
		return createAction('${scope}', '${type}', payload);\n\
	})`);
}

export default createTypedActionCreator;