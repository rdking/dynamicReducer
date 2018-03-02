dynamicReducer
==============
This package gives you 2 main features:
* Dynamic state management - 
  1. Allows blocks of state to be removed from the redux store automatically after a chosen action has been processed.
  2. Automatically initializes blocks of state just before any of the related actions are processed.
* Reduces the amount of common boiler-plate code required to manage actions and reducers.

This is accomplished by providing a reducer function to use as the store reducer, a middleware function to manage the state changes, and an API that keeps you from worrying about managing things like:
* Action name strings or constants
* Action object format consistency
* mapStateToProps
* mapDispatchToProps

Beyond providing the boiler-plate logic, and managing state initialization/destruction, this library does't change how you use redux. It just provides a (hopefully) straight-forward approach to managing state, reducers, listeners, and actions in a highly consistent fashion.

Highlights
==========
DynamicReducer introduces the concept of a scope for all actions, states, listeners, and reducers that it manages. This scope is just a string used to uniquely identify a bundle of state data, actions, listeners, and reducer functions that all have the same lifetime. This scope iswhat allows dynamicReducer to efficiently identify when your state data needs to be initialized, as well as remove it all once the chosen ending event has been fired.

Documentation for the API can be found [here](https://rdking.github.io/dynamicReducer). More detail will be added as I learn how to use jsdoc.

* ```registerReducerAction``` - Use to define a new action and reducer. The action creator will be set as a property on the connected component.
* ```registerReducerActionListener``` - Use to define a new state listener.
* ```registerReducerScopeState``` - Use to declare where in the redux state object state for this scope will be stored.
* ```registerReducerModifiers``` - Use to configure the action that will remove this scope and the initializer function that will restore it.
* ```getRegisteredReducerScope,``` - Use to retrieve the scope configuration to help setup calls to connect.
* ```removeRegisteredReducerScope``` - Use to forcefully remove a declared scope at a time of your choosing.
* ```InitDataStore``` - Use to give this library access to the data store.
* ```DynamicReducerMiddleware``` - Use to automate management of scope and state configuration.

Example
-------
***Actions.js***
```javascript
import { getRegisteredReducerScope, registerReducerAction, registerReducerModifiers } from '../data/Redux/DynamicReducer';
import _ from 'lodash';

var scope = 'Splash';

function Initialize() {
	registerReducerAction(scope, 'AFTER_FADE_IN', [], (state, action) => {
		var retval= _.cloneDeep(state);
		//TODO: Check app version
		//TODO: Get Appa Settings.
		//TODO: Get LaunchDarkly Flags

		return retval;
	});

	registerReducerAction(scope, 'AFTER_ANIMATION', ['navigation'], (state, action) => {
		var navigation = action.payload.navigation;
		var retval = _.cloneDeep(state);

		if (state.hasCredentials) {
			//TODO: Attempt autoLogin
		}
		
		if (state.session instanceof Object) {
			console.log("Jump-starting session...");
			navigation.navigate('Session');
		}
		else {
			console.log("Login required!");
			navigation.navigate('LoginView');
		}

		return retval;
	});
}

registerReducerModifiers(scope, 'AFTER_ANIMATION', Initialize);

const { Actions, ActionState, ActionBuilders } = getRegisteredReducerScope(scope);
export { scope, Actions, ActionState, ActionBuilders };
```

***View.js***
```jsx
import React, { Component } from 'react';
import {
	Platform,
	StyleSheet,
	Image
} from 'react-native';
import { connect } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import FadeView from './components/FadeView';
import { getRegisteredReducerScope } from './data/Redux/DynamicReducer';
import { Actions, ActionState, ActionBuilders } from './actions/Splash';

class Splash extends Component {
	afterFadeIn = () => {
		this.props.createAfterFadeIn();
	}
	afterAnimation = () => {
		this.props.createAfterAnimation(this.props.navigation);
	}
	render() {
		return (
			<LinearGradient style={styles.container} colors={['#2b313e', '#88c9f6']}>
				<FadeView onAfterFadeIn={ this.afterFadeIn } onAfterAnimation={ this.afterAnimation }>
					<Image source={require('../images/logos/appLogo.png')} style={styles.logo}/>
				</FadeView>
			</LinearGradient>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 0
	},
	logo: {
		resizeMode: 'contain',
		transform: [
			{ scaleX: 0.25 },
			{ scaleY: 0.25 }
		]
	}
});

export default connect(ActionState, ActionBuilders)(Splash);
```

***DataStore.js***
```javascript
import { createStore, applyMiddleware } from 'redux';
import DynamicReducer, { DynamicReducerMiddleware, InitDataStore } from  'dynamicReducer';

const store = createStore(DynamicReducer, applyMiddleware(DynamicReducerMiddleware));
InitDataStore(store);
export default store;

```
