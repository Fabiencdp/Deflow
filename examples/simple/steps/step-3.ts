import StepHandler from '../../../src/lib/StepHandler';

const Order = {
  find(f: any) {
    return [{ name: 'test', price: 5, user: { name: 'joe', email: 'test' } }];
  },
};

function sendmail(d: any) {
  return { status: true };
}

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
    step.
    const sendMailRes = await sendmail({
      from: 'no-reply@yourdomain.com',
      to: task.data.userEmail,
      subject: `Your ${step.data.date} invoice for ${task.data.productName}`,
      html: `
          Hello ${task.data.userName},
          You just spent ${task.data.productPrice} for ${task.data.productName}
        `,
    });

    task.failedCount;
    task.id;

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
