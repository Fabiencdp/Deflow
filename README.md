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

Comming soon: 
- Event that you can listen too
- Nodes concurrency configuration
