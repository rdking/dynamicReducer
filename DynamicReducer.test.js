import reducer, { InitDataStore,
	registerReducerAction, 
	registerReducerActionListener,
	registerReducerScopeState,
	registerReducerModifiers,
	getRegisteredReducerScope, 
	removeRegisteredReducerScope,
	DynamicReducerMiddleware
} from './DynamicReducer';
import { createStore, applyMiddleware } from 'redux';
import _ from 'lodash';


describe('dynamic reducer/action registry', () => {
	var store;
	beforeAll(() => {
		store = createStore(reducer, { count: 0 }, applyMiddleware(DynamicReducerMiddleware));
		InitDataStore(store);
	});
	describe('registerReducerAction', () => {
		it('should let us add actions to the reducer', () => {
			registerReducerAction("Test", "ADD", ["addend"], (state, action) => {
				return {
					count: (state.count || 0) + action.payload.addend
				};
			});

			var action = {scope: "Test", type:"ADD", payload: { addend:7 }}
			store.dispatch(action);
			var result = store.getState();
			expect(result).toEqual({count: 7});

			registerReducerAction("Test", "SUB", ["subtrahend"], (state, action) => {
				return {
					count: state.count - action.payload.subtrahend
				};
			});

			action = {scope: "Test", type:"SUB", payload: { subtrahend: 9}};
			store.dispatch(action);
			result = store.getState();
			expect(result).toEqual({count: -2});
		});
	});
	describe('getRegisteredReducerScope', () => {
		it('should return reducer actions "ADD" & "SUB" for scope "Test"', () => {
			var {Actions} = getRegisteredReducerScope("Test");
			expect(Actions).toEqual({ADD:"ADD",SUB:"SUB"});
		});
		it('should return reducer action builders "createAdd" & "createSub" for scope "Test"', () => {
			var {ActionBuilders} = getRegisteredReducerScope("Test");
			expect(ActionBuilders).toHaveProperty("createAdd");
			expect(ActionBuilders.createAdd).toBeInstanceOf(Function);
			expect(ActionBuilders).toHaveProperty("createSub");
			expect(ActionBuilders.createSub).toBeInstanceOf(Function);
		});
		describe('reducer action builders', () => {
			it('should create action objects', () => {
				var {createAdd, createSub} = getRegisteredReducerScope("Test").ActionBuilders;
				var result = createAdd(3);
				expect(result).toEqual({
					scope: "Test",
					type: "ADD",
					payload: {
						addend: 3
					}
				});

				result = createSub(17);
				expect(result).toEqual({
					scope: "Test",
					type: "SUB",
					payload: {
						subtrahend: 17
					}
				});
			});
		});
	});
	describe('removeRegisteredReducerScope', () => {
		it('should remove all actions and reducers for scope "Test"', () => {
			expect(getRegisteredReducerScope("Test")).toBeTruthy();
			removeRegisteredReducerScope("Test");
			let { ActionState, ActionBuilders } = getRegisteredReducerScope("Test");
			expect(ActionBuilders).toEqual({});
			expect(ActionState()).toEqual({});
		});
	});
	describe('reducer', () => {
		var state;

		beforeAll(() => {
			state = { foo: 'bar', count: 7 };
		});
		it('should return the state object I give it.', () => {
			var action = { scope: "Test", type: "Irrelevant", payload: {}};
			var result = reducer(state, action);
			expect(result).toEqual(state);

			action = { scope: "Test", type: Symbol(), payload: {}};
			result = reducer(state, action);
			expect(result).toEqual(state);
		});
		it('should respond appropriately to added reducers', () => {
			registerReducerAction("Test", "MUL", ["multiplicand"], (state, action) => {
				return {
					...state,
					count: state.count * action.payload.multiplicand
				};
			});

			state = reducer(state, 'default');

			var action = getRegisteredReducerScope("Test").ActionBuilders.createMul(13);
			var result = reducer(state, action);
			expect(result).toEqual({count: 91, foo:'bar'});
		});
	});
	describe('registerReducerScopeState', () => {
		beforeAll(() => {
			removeRegisteredReducerScope("Test");
			console.log(`Testing before: state = ${JSON.stringify(store.getState(), null, '\t')}`);
			registerReducerScopeState("Test", "very.nested.object.data", { foo: 'bar', count: 7 });
		});
		it('should queue a state change that will run just before the next scope action is invoked', () => {
			console.log(`Testing after: state = ${JSON.stringify(store.getState(), null, '\t')}`);
			registerReducerAction("Test", "SOME_ACTION", [ 'fubar' ], (state, action) => {
				var retval = _.cloneDeep(state);
				expect(retval.very.nested.object.data.foo).toEqual('bar');
				retval.very.nested.object.data.foo = action.payload.fubar;
				console.log(JSON.stringify(retval, null, '\t'));
				return retval;
			});

			var action = getRegisteredReducerScope("Test").ActionBuilders.createSomeAction('snafu');
			console.log(`Dispatching!!! ${JSON.stringify(action, null, '\t')}`);
			store.dispatch(action);
			result = store.getState();
			console.log("After Dispatch: " + JSON.stringify(result, null, '\t'));
			expect(result.very.nested.object.data.foo).toEqual('snafu');
		});
	});
});
