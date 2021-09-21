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

- `options` &lt;[Object]>

  - `connection` &lt;[object]> Redis connection options
    - `host` &lt;?[string]> Redis hostname
    - `port` &lt;?[number]> Redis port (Defaults to `6379`)
    - `maxAttempts` &lt;?[number]> Redis max_attempts parameter
    - `connectTimeout` &lt;?[number]> Redis connect_timeout parameter
    - `retryMaxDelay` &lt;?[number]>\` Redis retry_max_delay parameter
  - `checkProcessQueueInterval` &lt;?[number]> An interval in ms at which the node will check for "ghost jobs" to replace them in the pending queue (defaults to `2000`)

- returns: &lt;[DeFlow]> DeFlow instance

`checkProcessQueueInterval` will trigger a method that release "ghost jobs" (i.e. append when a node crash while doing a job, letting the job in a process queue forever)
The release time is based on the [taskTimeout option](#step.options) of the current processed step, for example, if a task as a `taskTimeout` value of 2000ms, and the node handling that task make an unexpected crash, the task will be replaced in the pending queue after `taskTimeout` + (0 > `checkProcessQueueInterval`) ms.

#### _`static`_ Deflow.unregister()

Disconnect DeFlow from redis and pubSub instance

- returns: &lt;[Promise]&lt;[void]>>

### _`class`_ Workflow

#### _`static`_ Workflow.create()

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
