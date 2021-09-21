# DeFlow API

### Table of Contents

<!-- toc -->

- [_`class`_ DeFlow](#_class_-deflow)
  * [_`static`_ Deflow.register(options)](#_static_-deflowregisteroptions)
  * [_`static`_ Deflow.unregister()](#_static_-deflowunregister)
- [_`class`_ Workflow](#_class_-workflow)
  * [_`static`_ Workflow.create()](#_static_-workflowcreate)
  * [_`public`_ workflow.addStep()](#_public_-workflowaddstep)
  * [_`public`_ workflow.run()](#_public_-workflowrun)
  * [_`public`_ workflow.results()](#_public_-workflowresults)
  * [_`public`_ workflow.events](#_public_-workflowevents)
  * [_`public`_ workflow.events: 'done'](#_public_-workflowevents-done)
  * [_`public`_ workflow.events: 'nextTask'](#_public_-workflowevents-nexttask)
- [_`class`_ StepHandler](#_class_-stephandler)
  * [StepHandler.constructor](#stephandlerconstructor)
- [_`class`_ Step](#_class_-step)
  * [_`public`_ step.id](#_public_-stepid)
  * [_`public`_ step.name](#_public_-stepname)
  * [_`public`_ step.index](#_public_-stepindex)
  * [_`public`_ step.data](#_public_-stepdata)
  * [_`public`_ step.taskCount](#_public_-steptaskcount)
  * [_`public`_ step.options](#_public_-stepoptions)
  * [_`public`_ step.workflowId](#_public_-stepworkflowid)
  * [_`public`_ step.key](#_public_-stepkey)
  * [_`public`_ step.parentKey](#_public_-stepparentkey)
  * [_`public`_ step.addTasks()](#_public_-stepaddtasks)
  * [_`public`_ step.addAfter()](#_public_-stepaddafter)
  * [_`public`_ step.getProgress()](#_public_-stepgetprogress)
  * [_`public`_ step.getResults()](#_public_-stepgetresults)
- [_`class`_ Task](#_class_-task)
  * [_`public`_ task.data](#_public_-taskdata)
  * [_`public`_ task.result](#_public_-taskresult)
  * [_`public`_ task.error](#_public_-taskerror)
  * [_`public`_ task.failedCount](#_public_-taskfailedcount)

<!-- tocstop -->

### _`class`_ DeFlow

DeFlow class provide static method to connect with your redis backend

#### _`static`_ Deflow.register(options) 

Register your nodeJS process to the redis backend through DeFlow.
Run this method as soon as possible in your application.

- `options` <[Object]>

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
Create a new workflow


#### _`public`_ workflow.addStep()

#### _`public`_ workflow.run()

#### _`public`_ workflow.results()

#### _`public`_ workflow.events

#### _`public`_ workflow.events: 'done'

#### _`public`_ workflow.events: 'nextTask'

### _`class`_ StepHandler

#### StepHandler.constructor

### _`class`_ Step

#### _`public`_ step.id

#### _`public`_ step.name

#### _`public`_ step.index

#### _`public`_ step.data

#### _`public`_ step.taskCount

#### _`public`_ step.options

#### _`public`_ step.workflowId

#### _`public`_ step.key

#### _`public`_ step.parentKey

#### _`public`_ step.addTasks()

#### _`public`_ step.addAfter()

#### _`public`_ step.getProgress()

#### _`public`_ step.getResults()

### _`class`_ Task

#### _`public`_ task.data

#### _`public`_ task.result

#### _`public`_ task.error

#### _`public`_ task.failedCount





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
