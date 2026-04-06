# Melin
SOLID Pod based personal task management.

## The Idea

I like the experience of neovim, and the personal data storage of SOLID Pods. 
I like simple local-first experience with context based on what I'm working on.
I use simplicity of todo-lists to manage my day with some features of bullet journals.

A solution might be a simple, full screen TUI application, with bindings compatible with neovim
that will allow me to manage tasks in on a local file system, but synchronise it to my SOLID Pod. 

## ADR

* Use lofipod package (it is early development, but if features are missing suggest improvements to lofipod). 
* Use and expand ontology.ttl
* All data synchronisation should go through lofipod
