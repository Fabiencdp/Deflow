export default {
  beforeAll() {
    console.log('before all');
  },
  beforeEach() {
    console.log('before each');
  },
  handler() {
    console.log('HANDLER');
  },
  afterEach() {
    console.log('after each');
  },
  afterAll() {
    console.log('after all');
  },
};
