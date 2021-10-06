<h1 align="center">DeFlow</h1>
<p align="center">Distributed, Decentralized Workflow creator for Node, Backed by Redis.</p>

# Philosophy 
DeFlow attempt to fill the gap between a job scheduler and an ETL.  
It manage workflow queue with 3 mains elements : 

#### Workflow:
A Workflow defines a set of one or more steps, there created by a node process.

#### Steps:
Steps define a specific job that compose the workflow.
They're treated sequentially and are described by a single file (module).
This module file define the step lifecycle with predefined methods (before/after, error handler, task handler).

Each Step contain one or more tasks. 
A step can create one or more other steps, that way they can be multidimensional. 

#### Tasks:
Tasks are treated by the step "handler" lifecycle method, they are designed to be treated concurrently between node.
Tasks are handled functionnaly, accepting params and returning results. 
Tasks are configurable and can have timeout and retry strategy.

# Main features
- Distributed: Intelligent distribution and parallelization of tasks between multiple nodeJS process.
- Decentralized: Designed to be crash proof, backed by Redis, pub-sub communication between nodes.
- Lifecycle: Lifecycle method allow you to manage and evolve the workflow process. 
- Living workflow: Create steps or tasks on the fly, depending on the previous results. 
- Promises based API.
- Configurable concurrency, retries, error handling and more.
- TypeScript support.

## Getting started

> :warning: Currently at a **test in progress** status, please consider this when using in production

install:
```
npm i deflow
```

declare a step handler:
```typescript
// ./steps/string-to-number.ts 

import { StepHandler } from 'deflow';
  
/**
 * Declare the step handler and types
 * In this one, we convert string to float
 * NOTE: IT MUST BE EXPORTED AS DEFAULT
 */
  export default new StepHandler({

    /**
     * Init method allow you to prepare tasks based on anything you want
     * @param step
     */
    async beforeAll(step) {
      const tasks = ['12', '10', '7', '45']; // You can fetch data from external source or db
      await step.addTasks(tasks);
    },
  
    /**
     * This method will run for each task of the step
     * @param task
     */
    async handler(task) {
      return parseFloat(task.data);
    },
  
    /**
     * This method is executed after each tasks done
     * Useful to log progress and stuff
     * @param task
     * @param step
     */
    async afterEach(task, step) {
      const progress = await step.getProgress();
      console.log('Step1: afterEach', progress);
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
// ./index.ts 

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
    .create('some-custom-name')
    .addStep({ step: stringToNumber }) // Register the step
    .addStep({ step: antherProcessStep }) // Register the step
    .run(); // Run the workflow
}

// Run the workflow from somewhere in your code (make sure redis is connected before running it)
setTimeout(() => {
    runWorkflow();
}, 2000)
```

###### [Check the complete API Documentation](https://github.com/Fabiencdp/Deflow/tree/main/docs/api.md)


## Making things type safe

DeFlow allow you to define type safe stepHandler :

```typescript
/**
 * Sending invoices for each user having purchased a product today
 */
export default new StepHandler<
  { date: Date }, // step data type
  { productName: string; productPrice: number; userEmail: string; userName: string }, // Task data type
  { sentStatus: boolean } // Task result type
>({
  /**
   * Fetch user data from a database
   */
  async beforeAll(step) {
    const orders = await Order.find({ createdAt: step.data.date });

    // Create one task by order
    const tasks = orders.map((order) => ({
      productName: order.name,
      productPrice: order.price,
      userEmail: order.user.email,
      userName: order.user.name,
    }));

    return step.addTasks(tasks); // Each task will be processed by "handler" method
  },

  /**
   * For each task, send the invoice by email
   * Note that you can also access to the step "global" data
   * @param task
   * @param step
   */
  async handler(task, step) {
    const sendMailRes = await sendmail({
      from: 'no-reply@yourdomain.com',
      to: task.data.userEmail,
      subject: `Your ${step.data.date} invoice for ${task.data.productName}`,
      html: `
          Hello ${task.data.userName},
          You just spent ${task.data.productPrice} for ${task.data.productName}
        `,
    });

    return { sentStatus: sendMailRes.status };
  },

  /**
   * After all task done, log some important things and take needed actions based on results
   * @param step
   */
  async afterAll(step) {
    const res = await step.getResults();
    const errors = res.filter((task) => task.result.sentStatus === false);

    if (errors.length > 0) {
      console.warn(`WARNING: ${errors.length} sendmail errors! Will try fallback method`);

      // Add another step right after this one when we have errors
      await step.addAfter({
        step: sendMailFallBackStep,
        tasks: errors, // If needed, you can directly add tasks while adding step
        options: {
          taskConcurrency: 3, // Allow each node to treat 3 tasks concurrently
          taskTimeout: 2000, // Allow a timeout of 2000ms per task
          taskMaxFailCount: 3, // Allow a maximum of 3 retries
        },
      });
    }
  },
});

```

## Resources

- [API Documentation](https://github.com/Fabiencdp/Deflow/tree/main/docs/api.md)
- [Examples](https://github.com/Fabiencdp/Deflow/tree/main/examples)


### Coming next
- More events that you can listen too
- Advanced concurrency management
- Reducer
