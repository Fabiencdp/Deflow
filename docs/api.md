# DeFlow API

### Table of Contents

<!-- toc -->

- [class: DeFlow](#class-deflow)
  * [`_static_` Deflow.register(options)](#_static_-deflowregisteroptions)
  * [`_static_` Deflow.unregister()](#_static_-deflowunregister)
- [Workflow](#workflow)
  * [Workflow.create()](#workflowcreate)
  * [Workflow.addStep()](#workflowaddstep)
  * [Workflow.run()](#workflowrun)
  * [Workflow.results()](#workflowresults)
  * [Workflow.events](#workflowevents)
  * [Workflow.events: 'done'](#workflowevents-done)
  * [Workflow.events: 'nextTask'](#workflowevents-nexttask)
- [StepHandler](#stephandler)
  * [StepHandler.constructor](#stephandlerconstructor)
- [Step](#step)
  * [step.id](#stepid)
  * [step.name](#stepname)
  * [step.index](#stepindex)
  * [step.data](#stepdata)
  * [step.taskCount](#steptaskcount)
  * [step.options](#stepoptions)
  * [step.workflowId](#stepworkflowid)
  * [step.key](#stepkey)
  * [step.parentKey](#stepparentkey)
  * [step.addTasks()](#stepaddtasks)
  * [step.addAfter()](#stepaddafter)
  * [step.getProgress()](#stepgetprogress)
  * [step.getResults()](#stepgetresults)
- [Task](#task)
  * [task.data](#taskdata)
  * [task.result](#taskresult)
  * [task.error](#taskerror)
  * [task.failedCount](#taskfailedcount)
  * [task.addTasks()](#taskaddtasks)
  * [step.addAfter()](#stepaddafter-1)
  * [step.getProgress()](#stepgetprogress-1)
  * [step.getResults()](#stepgetresults-1)

<!-- tocstop -->

### class: DeFlow

DeFlow class provide static method to connect with your redis backend

#### `_static_` Deflow.register(options) 

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

#### `_static_` Deflow.unregister()

Disconnect DeFlow from redis and pubSub instance

- returns: &lt;[Promise]&lt;[void]>>

### Workflow

#### Workflow.create()

#### Workflow.addStep()

#### Workflow.run()

#### Workflow.results()

#### Workflow.events

#### Workflow.events: 'done'

#### Workflow.events: 'nextTask'

### StepHandler

#### StepHandler.constructor

### Step

#### step.id

#### step.name

#### step.index

#### step.data

#### step.taskCount

#### step.options

#### step.workflowId

#### step.key

#### step.parentKey

#### step.addTasks()

#### step.addAfter()

#### step.getProgress()

#### step.getResults()

### Task

#### task.data

#### task.result

#### task.error

#### task.failedCount

#### task.addTasks()

#### step.addAfter()

#### step.getProgress()

#### step.getResults()
