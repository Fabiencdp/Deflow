# DeFlow API

# Heading1

## Table of Contents

- [class: DeFlow](<#class: DeFlow>)

  - [Deflow.register(options)](<#Deflow.register(options)>)
  - [Deflow.unregister()](<#Deflow.unregister()>)

- [Workflow](#Workflow)

  - [Workflow.create()](<#Workflow.create()>)
  - [Workflow.addStep()](<#Workflow.addStep()>)
  - [Workflow.run()](<#Workflow.run()>)
  - [Workflow.results()](<#Workflow.results()>)
  - [Workflow.events](#Workflow.events)
  - [Workflow.events: 'done'](<#Workflow.events: 'done'>)
  - [Workflow.events: 'nextTask'](<#Workflow.events: 'nextTask'>)

- [StepHandler](#StepHandler)

  - [StepHandler.constructor](#StepHandler.constructor)

- [Step](#Step)

  - [step.id](#step.id)
  - [step.name](#step.name)
  - [step.index](#step.index)
  - [step.data](#step.data)
  - [step.taskCount](#step.taskCount)
  - [step.options](#step.options)
  - [step.workflowId](#step.workflowId)
  - [step.key](#step.key)
  - [step.parentKey](#step.parentKey)
  - [step.addTasks()](<#step.addTasks()>)
  - [step.addAfter()](<#step.addAfter()>)
  - [step.getProgress()](<#step.getProgress()>)
  - [step.getResults()](<#step.getResults()>)

- [Task](#Task)

  - [task.data](#task.data)
  - [task.result](#task.result)
  - [task.error](#task.error)
  - [task.failedCount](#task.failedCount)
  - [task.addTasks()](<#task.addTasks()>)
  - [step.addAfter()](<#step.addAfter()>)
  - [step.getProgress()](<#step.getProgress()>)
  - [step.getResults()](<#step.getResults()>)

## class: DeFlow

DeFlow class provide static method to connect with your redis backend

### Deflow.register(options)

_static_
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

### Deflow.unregister()

Disconnect DeFlow from redis and pubSub instance

- returns: &lt;[Promise]&lt;[void]>>

## Workflow

### Workflow.create()

### Workflow.addStep()

### Workflow.run()

### Workflow.results()

### Workflow.events

### Workflow.events: 'done'

### Workflow.events: 'nextTask'

## StepHandler

### StepHandler.constructor

## Step

### step.id

### step.name

### step.index

### step.data

### step.taskCount

### step.options

### step.workflowId

### step.key

### step.parentKey

### step.addTasks()

### step.addAfter()

### step.getProgress()

### step.getResults()

## Task

### task.data

### task.result

### task.error

### task.failedCount

### task.addTasks()

### step.addAfter()

### step.getProgress()

### step.getResults()
