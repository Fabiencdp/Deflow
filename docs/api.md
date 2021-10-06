# DeFlow API

> :warning: API Documentation is a work in progress

### Table of Contents

<!-- toc -->

- [_`class`_ DeFlow](#_class_-deflow)
  * [_`static`_ Deflow.register(options)](#_static_-deflowregisteroptions)
  * [_`static`_ Deflow.unregister()](#_static_-deflowunregister)
- [_`class`_ Workflow](#_class_-workflow)
  * [_`static`_ Workflow.create(name, options?)](#_static_-workflowcreatename-options)
  * [_`public`_ workflow.addStep(addStepData)](#_public_-workflowaddstepaddstepdata)
  * [_`public`_ workflow.run()](#_public_-workflowrun)
  * [_`public`_ workflow.results()](#_public_-workflowresults)
  * [_`event`_ workflow: 'done'](#_event_-workflow-done)
  * [_`event`_ workflow: 'nextTask'](#_event_-workflow-nexttask)
- [_`class`_ StepHandler](#_class_-stephandler)
  * [StepHandler.constructor](#stephandlerconstructor)
  * [StepHandler.constructor.options](#stephandlerconstructoroptions)
- [_`class`_ Step](#_class_-step)
  * [_`public`_ step.addTasks(taskData[])](#_public_-stepaddtaskstaskdata)
  * [_`public`_ step.addAfter(addStepData)](#_public_-stepaddafteraddstepdata)
  * [_`public`_ step.getProgress()](#_public_-stepgetprogress)
  * [_`public`_ step.getResults()](#_public_-stepgetresults)
- [_`class`_ Task](#_class_-task)

<!-- tocstop -->

### _`class`_ DeFlow

DeFlow class provide static method to connect with your redis backend

#### _`static`_ Deflow.register(options)

Register your nodeJS process to the redis backend through DeFlow.
Run this method as soon as possible in your application.

- `options` <[object]>

  - `connection` <[object]> Redis connection options
    - `host` <[string]> Redis hostname
    - `port` <?[number]> Redis port (Defaults to `6379`)
    - `maxAttempts` <?[number]> Redis max_attempts parameter
    - `connectTimeout` <?[number]> Redis connect_timeout parameter
    - `retryMaxDelay` <?[number]> Redis retry_max_delay parameter
  - `checkProcessQueueInterval` <?[number]> An interval in ms at which the node will check for "ghost jobs" to replace them in the pending queue (defaults to `2000`)

- returns: <[DeFlow]> DeFlow instance

`checkProcessQueueInterval` will trigger a method that release "ghost jobs" (i.e. append when a node crash while doing a job, letting the job in a process queue forever)
The release time is based on the [taskTimeout option](#step.options) of the current processed step, for example, if a task as a `taskTimeout` value of 2000ms, and the node handling that task make an unexpected crash, the task will be replaced in the pending queue after `taskTimeout` + (0 > `checkProcessQueueInterval`) ms.

#### _`static`_ Deflow.unregister()

Disconnect DeFlow from redis and pubSub instance

- returns: <[Promise]<[void]>>

### _`class`_ Workflow

#### _`static`_ Workflow.create(name, options?)

Create a new workflow instance

- `name` <[string]> Custom workflow name
- `options` <?[object]> Workflow main options
  - `ifExist` <?[string]> If a workflow with the same name exist, replace it or create another one, accept `replace` or `create` (Defaults to `create`)
  - `cleanOnDone` <?[boolean]> Remove redis key/list and everything related to workflow when it's done (Defaults to `true`)
- returns: <[Workflow]> Workflow instance

#### _`public`_ workflow.addStep(addStepData)

Add a step to the workflow instance

- params: <[AddStep]> Add step data
  - `step` <[string]|[StepHandler](#_class_-stephandler)> the exported step to execute, or an absolute path to it. When using a stepHandler instance, deflow automatically resolve the module path to store it as an absolute path in the redis database, allowing other nodes to execute the stepHandler.
  - `data` <?[any]> Any kind of data needed by the step (user defined)
  - `options` <?[object]> Step options, this declaration overrides stepHandler options, and so workflow options
    - `taskTimeout` <?[number]> Timeout in ms after which the task will be considered as failed (task.error will be filled) (Defaults to `0`)
    - `taskConcurrency` <?[number]> Number of task that **one nodeJS process** can do in parallel (Default to `1`)
    - `taskMaxFailCount` <?[number]> Define the max number of retry possible for a task (Default to `1`)
    - `taskFailRetryDelay` <?[number]> Time in ms to delay the task execution when retrying (Default to `null`)
- returns: <[Workflow]> Workflow instance

#### _`public`_ workflow.run()

Run the workflow, will store redis data and start step processing

- returns: <[Workflow]> Workflow instance

#### _`public`_ workflow.results()

Return the complete workflow results,

- returns: <[Promise]<[WorkflowResult]>
  - `id` <[string]> Workflow unique id
  - `name` <[string]> Workflow name
  - `options` <[object]> Workflow options
  - `steps` <[array]<[object]>> Executed steps
    - `id` <[string]> Step unique id
    - `name` <[string]> Step name
    - `data` <[any]|[undefined]> Optional data passed to the step
    - `options` <[object]> Step options
    - `taskCount` <[number]> Number of task attached to the step
    - `workflowId` <[string]> The workflow id
    - `key` <[string]> The redis key identifier of the step
    - `tasks` <[array]<[object]>> Tasks list and results
      - `id` <[string]> Task unique id
      - `data` <[any]> Task data
      - `failedCount` <[number]> Number of error happened
      - `stepKey` <[string]> The parent step id
      - `result` <[any]|[undefined]> Task result if success
      - `error` <?[string]> Error message

#### _`event`_ workflow: 'done'

Emitted when the workflow is done, returning compete workflow results

- returns: [WorkflowResult](#_public_-workflowresults)

#### _`event`_ workflow: 'nextTask'

Emitted when a task is started by a node

- returns: <[_`class`_ Task](#_class_-task)>

### _`class`_ StepHandler

#### StepHandler.constructor

Create a step handler:

```typescript
export default new StepHandler({
  options: {},

  beforeAll(step) {},

  handler(task, step) {},

  onHandlerError(task, step, error) {},

  afterAll(step) {},
});
```

#### StepHandler.constructor.options

Optional handler options, define process option: 

- properties: <[StepOptions]>

### _`class`_ Step

Step instance definition:

- properties:
  - `id` <[string]> Step unique id
  - `name` <[string]> Step name
  - `data` <any|[undefined]> Optional data passed to the step
  - `options` <[object]> Step options
      - `taskTimeout` <?[number]> Timeout in ms after which the task will be considered as failed (task.error will be filled) (Defaults to `0`)
      - `taskConcurrency` <?[number]> Number of task that **one nodeJS process** can do in parallel (Default to `1`)
      - `taskMaxFailCount` <?[number]> Define the max number of retry possible for a task (Default to `1`)
      - `taskFailRetryDelay` <?[number]> Time in ms to delay the task execution when retrying (Default to `null`)
  - `taskCount` <[number]> Number of task attached to the step
  - `workflowId` <[string]> The workflow id
  - `key` <[string]> The redis key identifier of the step

#### _`public`_ step.addTasks(taskData[])

Add an array of tasks to the current step, usually used in the `beforeAll` method

- params: <[array]<[any]>> Array of task data to add to the step

- returns: <[Promise]<[void]>>

#### _`public`_ step.addAfter(addStepData)

Add a step after the current one, usually used in the `beforeAll`, `afterAll` method.
It allow you to add step from a running step, based on results or anything.

- params: <[AddStep]> Add step data
  - `step` <[string]|[StepHandler](#_class_-stephandler)> the exported step to execute, or an absolute path to it. When using a stepHandler instance, deflow automatically resolve the module path to store it as an absolute path in the redis database, allowing other nodes to execute the stepHandler.
  - `data` <?[any]> Any kind of data needed by the step (user defined)
  - `options` <?[object]> Step options, this declaration overrides stepHandler options, and so workflow options
    - `taskTimeout` <?[number]> Timeout in ms after which the task will be considered as failed (task.error will be filled) (Defaults to `0`)
    - `taskConcurrency` <?[number]> Number of task that **one nodeJS process** can do in parallel (Default to `1`)
    - `taskMaxFailCount` <?[number]> Define the max number of retry possible for a task (Default to `1`)
    - `taskFailRetryDelay` <?[number]> Time in ms to delay the task execution when retrying (Default to `null`)
    
- returns: <[Promise]<[Step]>> created step

#### _`public`_ step.getProgress()

- returns: <[Promise]<[object]>>
  - `done` <[number]> Number of tasks done
  - `total` <[number]> Number of total task (step.taskCount)
  - `percent` <[string]> A formatted message of the current progress

#### _`public`_ step.getResults()

Return step tasks with results:

- returns: <[Promise]<[array]<[Task]>>>

### _`class`_ Task

Task instance definition:

- properties:
  - `id` <[string]> Task unique id
  - `data` <[any]> Task data
  - `failedCount` <[number]> Number of error happened
  - `stepKey` <[string]> The parent step redis key
  - `result` <?[any]> Task result if success
  - `error` <?[string]> Error message

[task]: #_class_-task 'Task'
[step]: #_class_-step 'Step'
[any]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any 'Array'
[void]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#void 'void'
[axnode]: #accessibilitysnapshotoptions 'AXNode'
[accessibility]: #class-accessibility 'Accessibility'
[array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array 'Array'
[body]: #class-body 'Body'
[browsercontext]: #class-browsercontext 'BrowserContext'
[browserfetcher]: #class-browserfetcher 'BrowserFetcher'
[browser]: #class-browser 'Browser'
[buffer]: https://nodejs.org/api/buffer.html#buffer_class_buffer 'Buffer'
[cdpsession]: #class-cdpsession 'CDPSession'
[childprocess]: https://nodejs.org/api/child_process.html 'ChildProcess'
[connectiontransport]: ../src/WebSocketTransport.js 'ConnectionTransport'
[consolemessage]: #class-consolemessage 'ConsoleMessage'
[coverage]: #class-coverage 'Coverage'
[dialog]: #class-dialog 'Dialog'
[elementhandle]: #class-elementhandle 'ElementHandle'
[element]: https://developer.mozilla.org/en-US/docs/Web/API/element 'Element'
[error]: https://nodejs.org/api/errors.html#errors_class_error 'Error'
[executioncontext]: #class-executioncontext 'ExecutionContext'
[filechooser]: #class-filechooser 'FileChooser'
[frame]: #class-frame 'Frame'
[jshandle]: #class-jshandle 'JSHandle'
[keyboard]: #class-keyboard 'Keyboard'
[map]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map 'Map'
[mouse]: #class-mouse 'Mouse'
[object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object 'Object'
[page]: #class-page 'Page'
[promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise 'Promise'
[httprequest]: #class-httprequest 'HTTPRequest'
[httpresponse]: #class-httpresponse 'HTTPResponse'
[securitydetails]: #class-securitydetails 'SecurityDetails'
[serializable]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description 'Serializable'
[target]: #class-target 'Target'
[timeouterror]: #class-timeouterror 'TimeoutError'
[touchscreen]: #class-touchscreen 'Touchscreen'
[tracing]: #class-tracing 'Tracing'
[uievent.detail]: https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail 'UIEvent.detail'
[uskeyboardlayout]: ../src/common/USKeyboardLayout.ts 'USKeyboardLayout'
[unixtime]: https://en.wikipedia.org/wiki/Unix_time 'Unix Time'
[webworker]: #class-webworker 'Worker'
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type 'Boolean'
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function 'Function'
[iterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols 'Iterator'
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type 'Number'
[origin]: https://developer.mozilla.org/en-US/docs/Glossary/Origin 'Origin'
[selector]: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors 'selector'
[stream.readable]: https://nodejs.org/api/stream.html#stream_class_stream_readable 'stream.Readable'
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type 'String'
[symbol]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Symbol_type 'Symbol'
[xpath]: https://developer.mozilla.org/en-US/docs/Web/XPath 'xpath'
[customqueryhandler]: #interface-customqueryhandler 'CustomQueryHandler'
