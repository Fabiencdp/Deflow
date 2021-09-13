<h1 align="center">DeFlow</h1>
<p align="center">Distributed, Decentralized Workflow creator for Node, Backed by Redis.</p>

# Philosophy 
DeFlow attempt to fill the gap between a job scheduler and an ETL.  
It manage workflow queue with 3 mains elements : 

##### Workflow:
A Workflow define a set of one or more steps, there created by a node process.

##### Steps:
Steps define a specific job that compose the workflow.
They're treated sequentially and are described by a single file (module).
This module file define the step lifecycle with predefined methods (before/after, error handler, task handler).

Each Step contain one or more tasks. 
A step can create one or more other steps, that way they can be multidimensional. 

##### Tasks:
Tasks are treated by the step "handler" lifecycle method, they are designed to be treated concurrently between node.
Tasks are handled functionnaly, accepting params and returning results. 
Tasks are configurable and can have timeout and retry strategy.

# Main features
- Distributed: Intelligent distribution and parallelization of bunch of tasks between multiple node handler.
- Decentralized: Designed to be crash proof, backed by Redis, pub-sub communication between nodes.
- Lifecycle: Lifecycle method allow you to manage and evolve the workflow process. 
- Living workflow: Create steps or tasks on the fly, depending on the previous results. 

- Promises based API.
- Module declaration.
- Configurable concurrency, error handling and more.
- Compatible with TypeScript.
- Dynamic handler declaration.

### Coming next
- More events that you can listen too
- Advanced concurrency management

### Getting started

install:
```
npm i deflow
```

declare a step handler:
```typescript
// steps/string-to-number.ts 

import { StepHandler } from 'deflow';
  
/**
 * Declare the step handler and types
 * In this one, we convert string to float
 * NOTE: IT MUST BE EXPORTED AS DEFAULT
 */
  export default new StepHandler({

    /**
     * Init method allow you to prepare tasks based on anything
     * @param step
     */
    async beforeAll(step) {
      const tasks = ['12', '10', '7', '45']; // You can fetch data from external souce or db
      await step.addTasks(tasks);
    },
  
    /**
     * This function will run for each task of the step
     * @param task
     */
    async handler(task) {
      console.log('Step1: handler', task.data);
      await new Promise((r) => setTimeout(() => r(null), 1000));
      return parseFloat(task.data);
    },
  
    /**
     * This method is executed after each tasks done
     * Useful to log progress and stuff
     * @param task
     * @param step
     */
    async afterEach(task, step) {
      console.log('Step1: afterEach', await step.getProgress());
      console.log('Step1: Result', task.result); // Should be a floating number
    },
  
    /**
     * This method is executed after all tasks done
     * Useful to save results in a db or whatever you want
     * @param step
     */
    async afterAll(step) {
      console.log('Step1: afterAll', await step.getProgress());
      console.log('Step1: Result', await step.getResults());
    },
  });
```

declare a workflow:
```typescript
// index.ts 

import DeFlow, { WorkFlow } from 'deflow';

import stringToNumber from './steps/string-to-number';
import antherProcessStep from './steps/anther-process-step';

// Register deflow to your redis backend  
DeFlow.register({ connection: { host: 'localhost', port: 6379 } });

/**
 * Workflow test file
 */
function runWorkflow() {
  WorkFlow
    .create('some-name') // Some custom name 
    .addStep({ step: stringToNumber }) // Register the step
    .addStep({ step: antherProcessStep }) // Register the step
    .run();
}

// Run the workflow from somewhere in your code 
runWorkflow();
```
