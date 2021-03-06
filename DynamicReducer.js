import { connect } from 'react-redux';
import createTypedActionCreator from './Action';
import _ from 'lodash';

/*
 * Scopes is an object heirarchy that the dynamic reducer uses to call reducers
 * that have been registered at various points during the app. The state data
 * associated with the reducers is initialied using the values in this object
 * as well. It's structure is as follows:
 * 
 * scopes: {
 *   <scopeName>: {
 *     initializers: [
 *       {
 *         action: {   //Optional if store exists
 *           actionBuilderName: 'create' + toCamelCase(actionName),
 *           ['create' + toCamelCase(actionName)]: <action creator method>,
 *           name: <actionName>,
 *           reducer: <reducer method>
 *         },
 *         state: {    //Optional if action exists
 *           init: <Initialization object>,
 *           root: path under state for data
 *         }
 *       }
 *     ],
 * 	   components: [
 *       <React.Component>, ...
 *     ],
 *     listeners: [
 *       {
 *         handler: <subscription method>,
 *         unsubscribe: <unsubscribe method>
 *       }
 *     ],
 *     <actionName>: {
 *       actionBuilderName: 'create' + toCamelCase(actionName),
 *       ['create' + toCamelCase(actionName)]: <action creator method>,
 *       name: <actionName>,
 *       reducer: <reducer method>
 *     }
 *   }
 * }
 */
var scopes = {};
var dataStore = null;
var modifiers = {};
var initializers = [];
var GLOBAL_SCOPE = Symbol("GLOBAL_SCOPE");
var CONFIGURE = Symbol("CONFIGURE");
var DECONFIGURE = Symbol("DECONFIGURE");
var INITIALIZE = Symbol("INITIALIZE");


function toCamelCase(name) {
	var retval = name;
	
	if (/^[A-Z_][\dA-Z_]+$/.test(name)) {
		var pieces = name.split('_');
		retval = '';

		for (var i=0; i<pieces.length; ++i) {
			retval += pieces[i][0].toUpperCase() + pieces[i].substring(1).toLowerCase();
		}
	}

	return retval;
}

function getObjectAtPath(source, path) {
	var p = (path) ? path.split('.') : [];
	var retval = source;

	for (var element of p) {
		retval[element] = retval[element] || {};
		retval = retval[element];
	}

	return retval;
}

function initializeScope(init, state) {
	scopes[init.scope] = scopes[init.scope] || getNewScope();
	let cfg = init.initializer;
	switch(init.type) {
		case 'action': {
			scopes[init.scope][cfg.action.name] = cfg.action;
			break;
		}
		case 'state': {
			let pathStr = cfg.state.root;
			let path = (pathStr) ? pathStr.split('.') : [];
			let field = path.pop();
			let target = getObjectAtPath(state, path.join('.'));
		
			target[field] = _.cloneDeep({
				...cfg.state.init,
				...((target[field] instanceof Object) ? target[field] : {})
			});
			break;
		}
		default:
			throw new Error('Invalid action/state initialization request!');
	}

	if (init.type == 'state') {
		scopes[init.scope].initializers.unshift(init);
	}
	else {
		scopes[init.scope].initializers.push(init);		
	}
}

function destroyScope(scope, state) {
	for (var i=0; i<scope.initializers.length; ++i) {
		let cfg = scope.initializers[i];
		switch(cfg.type) {
			case 'action':
				break;
			case 'state': {
				let path = (cfg.root)?cfg.root.split('.') : [];
				let field = path.pop();
				let target = getObjectAtPath(state, path.join('.'));
		
				delete target[field];
				break;
			}
			default:
				console.log(JSON.stringify(scope.initializers, null, '\t'));
				throw new Error('Invalid action/state destruction request!');
		}
	}
}

function getNewScope() {
	var retval = {};
	Object.defineProperties(retval, {
		initializers: {
			value: []
		},
		listeners: {
			value: []
		},
		components: {
			value: []
		}
	});
	return retval;
}

/**
 * This is DynamicReducer's core function, the one to be used in createStore.
 * It ensures that all registered reducers are consulted when the state is
 * changed.
 * 
 * @export
 * @param {Object} state - the current state as known to redux.
 * @param {Object} action - the action object that defines the action to be taken.
 * @param {string} action.type - The type key for the action.
 * @param {string} action.scope - The scope group this action belongs to.
 * @param {Object} action.payload - The object holding the action parameters.
 * @returns {Object} The updated or original state object as necessary.
 */
export default function reducer (state, action) {
	var retval = _.cloneDeep(state) || {};

	switch(action.type) {
		case INITIALIZE: {
			let scope = (action.scope) ? [ action.scope ] : Object.keys(modifiers);
			
			for (let i=0; i<scope.length; ++i) {
				let mod = modifiers[scope[i]];
				if (mod && !mod.initial.launched) {
					mod.initial.launched = true;
					mod.final.launched = false;
					initializers.push(mod.initial.method);
				}
			}

			if (action.payload) {
				initializers.push(() => { dataStore.dispatch(action.payload); });
			}
			break;
		}
		case CONFIGURE: {
			let init = action.payload;
			initializeScope(init, retval);
			break;
		}
		case DECONFIGURE: {
			let scope = action.payload;
			destroyScope(scope, retval);
			break;
		}
		default: {
			if (scopes[action.scope] && (action.type in scopes[action.scope])) {
				retval = scopes[action.scope][action.type].reducer(retval, action);
			}
			else {
				retval = state;
			}
		}
	}

	return retval;
}

/**
 * Registers a new Redux action and it's corresponding reducer.
 * 
 * @export
 * @param {string} scope - A unique name for a configuring group
 * where all related registration info will be held. Used to later remove all
 * associated state, actions, and reducers.
 * @param {string} action - Name of the action being registered.
 * @param {string[]} fields - Names of the action payload fields.
 * @param {Function} reducer - Function that will be used to handle the action
 * being registered
 */
export function registerReducerAction(scope, action, fields, reducer) {
	scope = scope || GLOBAL_SCOPE;
	var name = `create${toCamelCase(action)}`;
	dataStore.dispatch({
		scope,
		type: CONFIGURE,
		payload: {
			type: 'action',
			scope,
			initializer: {
				action: {
					name: action,
					actionBuilderName: name,
					[name]: createTypedActionCreator(scope, action, fields),
					reducer
				}
			}
		}
	});
}

/**
 * Registers a new Redux state object and it's corresponding initializer.
 * 
 * @export
 * @param {string} scope - A unique name for a configuring group
 * where all related registration info will be held. Used to later remove all
 * associated state, actions, and reducers.
 * @param {string} root - Field path through the state to the location where
 * the new state will exist.
 * @param {Object} init - Object containing initial state data.
 */
export function registerReducerScopeState(scope, root, init) {
	scope = scope || GLOBAL_SCOPE;
	dataStore.dispatch({
		scope,
		type: CONFIGURE,
		payload: {
			type: 'state',
			scope,
			initializer: {
				state: { root, init }
			}
		}
	});
}

/**
 * Registers the action that will trigger the scope's destruction, and an 
 * initialization function against the given scope. This allows
 * DynamicReducer a means of automatically building and destroying Redux
 * actions, reducers, and states as needed.
 * 
 * @export
 * @param {string} scope - A unique name for a configuring group
 * where all related registration info will be held. Used to later remove all
 * associated state, actions, and reducers.
 * @param {string} destroyAfter - Name of the action after which the given
 * scope should be destroyed.
 * @param {Function} initializer - Function used to initialize the given scope.
 */
export function registerReducerModifiers(scope, destroyAfter, initializer) {
	if ((typeof(scope) != "string") || (scope in modifiers)) {
		console.warn("Parameter 'scope' should be a string not already registered!\n" +
			     "Overwriting previous definition!");
	}
	if (typeof(initializer) != "function") {
		throw new Error ('Parameter "initializer" must be a function!');
	}
	
	modifiers[scope] = {
		destroyAfter,
		initial: {
			method: initializer,
			launched: false
		},
		final: {
			method: () => { removeRegisteredReducerScope(scope); },
			launched: false
		}
	};

	dataStore.dispatch({scope, type: INITIALIZE});
}

/**
 * Registers a new Redux listener. This listener will be removed when the 
 * corresponding scope is destroyed.
 * 
 * @export
 * @param {string} scope - A unique name for a configuring group
 * where all related registration info will be held. Used to later remove all
 * associated state, actions, and reducers.
 * @param {Function} listener - A function to call after any action is
 * dispatched.
 */
export function registerReducerActionListener(scope, listener) {
	scopes[scope] = scopes[scope] || getNewScope();
	var current = scopes[scope];
	var handler = () => { return listener(dataStore.getState(), dataStore.dispatch); };
	var unsubscribe = dataStore.subscribe(handler);
	current.listeners.push({
		handler,
		unsubscribe
	});
}

/**
 * @typedef {Object} RegisteredScope
 * @prop {Object} Actions - Each key in Actions is the name of a registered action.
 * @prop {Function} ActionState - Use as value for mapStateToProps in
 * the connect() call.
 * @prop {Object} ActionBuilders - Use as substitute for mapDispatchToProps
 */

/**
 * Retrieves 3 pieces of useful information from the registration data.
 * 
 * @param {string} scope - A unique name for a configuring group
 * where all related registration info will be held. Used to later remove all
 * associated state, actions, and reducers.
 * @returns {RegisteredScope} returns the key data needed to fully connect Dynamic
 * Reducer into Redux
 */
export function getRegisteredReducerScope(scope) {
	if (modifiers[scope] && !modifiers[scope].initial.launched) {
		dataStore.dispatch({scope, type: INITIALIZE});
	}
	var retval = {
		ActionState: (state) => {
			var current = scopes[scope] || {};
			var retval = {};
			if (current.initializers && current.initializers[0] && current.initializers[0].state) {
				retval = getObjectAtPath(state, current.initializers[0].state.root);
			}

			return retval;
		}
	};

	Object.defineProperties(retval, {
		Actions: {
			enumerable: true,
			value: (() => {
				var current = scopes[scope] || {};
				var retval = {};
				for (var key of Object.keys(current)) {
					retval[key] = key;
				}

				return retval;
			})()
		},
		ActionBuilders: {
			enumerable: true,
			value: (() => {
				var current = scopes[scope] || {};
				var retval = {};
				
				for (var action in current) {
					let name = current[action].actionBuilderName;
					retval[name] = current[action][name];
				}

				return retval;
			})()
		}
	});

	return retval;
}

/**
 * Removes actions, reducers, and state associated with the named scope from
 * the active process.
 * @param {string} scope - the name of the configuring group to remove
 */
export function removeRegisteredReducerScope(scope) {
	dataStore.dispatch({
		scope,
		type: DECONFIGURE,
		payload: scopes[scope]
	});
	delete scopes[scope];
}

/**
 * Used to give Dynamic Reducer the access to manage the data store along
 * with Redux. Also registers the listener used to initialize the scope
 * when needed.
 * @param {Object} store - The data store to manage.
 */
export function InitDataStore(store) {
	dataStore = store;
	store.subscribe(() => {
		while (initializers.length) {
			initializers.shift()();
		}
	});
}

/**
 * Redux middleware that enables automation of state, action, and reducer
 * inclusion and exclusion. This middleware should be added to the store at
 * the time of creation for best result. In fact, the only reason I don't 
 * declare the store within dynamic reducer is that I can't be certain the
 * developer doesn't want to use other redux middleware.
 * 
 * Example Usage
 * -------------
 * ```javascript
 * import { createStore, applyMiddleware } from 'redux';
 * import DynamicReducer, { DynamicReducerMiddleware, InitDataStore } from  './Redux/DynamicReducer';
 * 
 * const store = createStore(DynamicReducer, applyMiddleware(DynamicReducerMiddleware));
 * InitDataStore(store);
 * export default store;
 * ```
 */
export const DynamicReducerMiddleware = (store) => (next) => (action) => {
	var retval;

	if ((action.type == INITIALIZE) || !modifiers[action.scope] || modifiers[action.scope].initial.launched) {
		retval = next(action);
		var mod = modifiers[action.scope];

		if (mod && (mod.destroyAfter === action.type) && !mod.final.launched) {
			mod.final.method();
			mod.final.launched = true;
			mod.initial.launched = false;
		}
	}
	else {
		console.log("Redirecting dispatch!");
		store.dispatch({scope: action.scope, type: INITIALIZE, payload: action});
	}

	return retval;
}
