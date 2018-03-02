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
