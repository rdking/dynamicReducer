import createTypedActionCreator from './Action';

describe('generic action-creator generator', () => {
	it('should create an action-object generation function', () => {
		var creator = createTypedActionCreator("TEST", "TEST_TYPE", ['field1', 'field2', 'field3']);
		expect(creator).toBeTruthy();
		expect(creator).toBeInstanceOf(Function);
	});
	describe('the generated action-creator', () => {
		it('should create the expected action object', () => {
			var creator = createTypedActionCreator("TEST", "TEST_TYPE", ['field1', 'field2', 'field3']);
			expect(creator).toBeTruthy();
			expect(creator).toBeInstanceOf(Function);

			var result = creator('alpha', {}, 3);
			expect(result).toBeTruthy();
			expect(result).toEqual({
				scope: "TEST",
				type: "TEST_TYPE",
				payload: {
					field1: 'alpha',
					field2: {},
					field3: 3
				}
			});
		});
	});
});
