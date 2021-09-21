# DeFlow API

# Heading1

## Table of Contents

- [class: DeFlow](<#class: DeFlow>)

  - [Deflow.register](#Deflow.register)
  - [Deflow.unregister](#Deflow.unregister)

- [Workflow](#Workflow)

  - [Workflow.create()](<#Workflow.create()>)
  - [Workflow.addStep()](<#Workflow.addStep()>)
  - [Workflow.run()](<#Workflow.run()>)
  - [Workflow.results()](<#Workflow.results()>)
  - [Workflow.events](#Workflow.events)
  - [Workflow.events.done](#Workflow.events.done)
  - [Workflow.events.nextTask](#Workflow.events.nextTask)

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

### Deflow.register

### Deflow.unregister

## Workflow

### Workflow.create()

### Workflow.addStep()

### Workflow.run()

### Workflow.results()

### Workflow.events

### Workflow.events.done

### Workflow.events.nextTask

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
