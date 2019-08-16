const { Task } = require('../lib/task');

describe.only('Task', () => {
  test('should throw if ID is absent', () => {
    expect(() => {
      new Task();
    }).toThrow('Task requires an ID');
  });

  test('should throw if schema is invalid', () => {
    expect(() => {
      new Task(1, { data: 9 });
    }).toThrow('ValidationError');
  });

  test('should have required properties', () => {
    const task = new Task(1, { data: '"test-rpxYeBqs9o"', dedupKey: '', retryCount: '2' });
    expect(task).toMatchObject({
      id: 1,
      dataString: '"test-rpxYeBqs9o"',
      dataObj: 'test-rpxYeBqs9o',
      dedupKey: '',
      retryCount: 2
    });
  });

  test('should increment retry count', () => {
    const task = new Task(1, { data: '"test-rpxYeBqs9o"', dedupKey: '', retryCount: '2' });
    task.incrRetry();

    expect(task).toMatchObject({
      id: 1,
      dataString: '"test-rpxYeBqs9o"',
      dataObj: 'test-rpxYeBqs9o',
      dedupKey: '',
      retryCount: 3
    });
  });
});
