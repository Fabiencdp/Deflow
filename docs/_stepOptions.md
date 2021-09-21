
        - `taskTimeout` <?[number]> Timeout in ms after which the task will be considered as failed (task.error will be filled) (Defaults to `0`)
        - `taskConcurrency` <?[number]> Number of task that **one nodeJS process** can do in parallel (Default to `1`)
        - `taskMaxFailCount` <?[number]> Define the max number of retry possible for a task (Default to `1`)
        - `taskFailRetryDelay` <?[number]> Time in ms to delay the task execution when retrying (Default to `null`)
        
