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

Documentation for the API is in the ```/docs``` folder.

Example
=======
I'm borrowing an example provided by [Aaron Van Bokhoven](https://medium.com/@aaronvb/a-simple-react-native-redux-example-b8e22a6e93d0). His example code is perfect for providing a comparative example of how to use dynamicReducer.


**Without dynamicReducer**
```javascript
// Start the sequence of item ID's at 0
let nextItemId = 0;
// Items reducer
const items = (state = [], action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      return [
        ...state,
        {
          id: nextItemId++,
          name: action.name,
          bgColor: action.bgColor
        }
      ];
    }
    case "REMOVE_ITEM": {
      // Find index of item with matching ID and then
      // remove it from the array by its' index
      const index = state.findIndex(x => x.id === action.id);
      return [...state.slice(0, index), ...state.slice(index + 1)];
    }
    default:
      return state;
  }
};
export default items;
```

```jsx
render() {
    return (
      <ListView
        style={styles.container}
        enableEmptySections={true}
        dataSource={this.props.dataSource}
        renderRow={rowData => {
          return (
            <Item
              rowData={rowData}
              handleDestroyItem={id => this.handleDestroyItem(id)}
            />
          );
        }}
      />
    );
  }
}
// Handle data source change from redux store
const dataSource = new ListView.DataSource({
  rowHasChanged: (r1, r2) => r1 !== r2
});
function mapStateToProps(state) {
  return {
    dataSource: dataSource.cloneWithRows(state.items)
  };
}
ItemList.propTypes = {
  dataSource: PropTypes.object,
  dispatch: PropTypes.func
};
export default connect(mapStateToProps)(ItemList);
```
**With dynamicReducer**
```javascript
// Start the sequence of item ID's at 0
let nextItemId = 0;
// Items reducer
function InitList() {
	var scope = 'List';
	registerReducerState(scope, 'items', []);

	registerReducerAction(scope, 'ADD_ITEM', ['name', 'bgColor'], (state={}, action) => {
		var retval = { ...state };
		retval.items.push({
			id: nextItemId++,
			name: action.payload.name,
			bgColor: action.payload.bgColor
		});
		return retval;
	});

	registerReducerAction(scope, 'REMOVE_ITEM', ['id'], (state={}, action) => {
		var retval = { ...state };
		// Find index of item with matching ID and then
		// remove it from the array by its' index
		const index = state.items.findIndex(x => x.id === action.payload.id);
		return [...state.items.slice(0, index), ...state.items.slice(index + 1)];
	});
}

registerReducerModifiers(scope, 'RESET_LIST', InitList);
```

```jsx
render() {
    return (
      <ListView
        style={styles.container}
        enableEmptySections={true}
        dataSource={this.props.dataSource}
        renderRow={rowData => {
          return (
            <Item
              rowData={rowData}
              handleDestroyItem={id => this.handleDestroyItem(id)}
            />
          );
        }}
      />
    );
  }
}
// Handle data source change from redux store
const dataSource = new ListView.DataSource({
  rowHasChanged: (r1, r2) => r1 !== r2
});
function mapStateToProps(state) {
  return {
    dataSource: dataSource.cloneWithRows(state.items)
  };
}
ItemList.propTypes = {
  dataSource: PropTypes.object,
  dispatch: PropTypes.func
};
export default connect(mapStateToProps)(ItemList);
```
