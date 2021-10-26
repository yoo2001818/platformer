# The problem of signals
The ECS framework should not use signals in order to optimize the memory access
pattern, because if we end up using signals, the CPU will perform other tasks
while doing other tasks ... which will invalidate the CPU cache and the
performance will not be great.

If we only need to render entities onto the OpenGL screen, it's actually fine,
because all the elements must be redrawn anyway, so we have to traverse
everything.

However, if we need to do something else with it, for example, draw GUI using
the entities, it is not feasible now.

It is actually possible to redraw everything every frame, just like OpenGL.
This is actually implemented in C/C++ land, for example Dear ImGui implements
immediate mode GUI.

If we use immediate mode GUI, the programming becomes extremely simple, as we
don't have to think about invalidation and redrawing. The underlying layer,
let's say, React, performs all the virtual DOM and rerendering tasks so the
performance penalty can be reasonable.

However, since it is so wasteful, it's hardly used outside debugging menu. Only
debugging elements are drawn using immediate mode GUI.

While the web provides a good foundation to build GUI elements, and React
provides reasonable performance even with immediate mode GUI, it is not really
good idea to keep it like this.

Instead, we need to think the engine as another state library. Most state
library performs diff-checking or utilizes signals to determine which elements
need to be updated.

Since diff-checking is not feasible for mass-updated state like the game engine,
it's already out of question, but redux and flux patterns do use it.

The signal pattern can be easily encapsulated in 'atoms', which determines the
minimal rendering element. MobX hides this implementation detail and instead
requires special handling for state management, while Recoil and Jotai, or
modern state library makes use of atoms.

However, like I said before, the ECS framework specificially avoids using
signals because it completely ruins the CPU cache.

The other option, diffing is not feasible at all.

## Version management
I think we can come up with a way that we can reap the benefits of signals,
while avoiding CPU cache thrashing.

If we can store each atom's versions, and come with a way to quickly determine
whether if a listener needs to be called again, we can implement signals.

Of course, the number of listeners must be adquate enough to implement this,
however I expect it to be small enough to not matter at all.

It basically boils down to choosing bottom-up, or top-down at this point.

Is it better to make skip-lists or trees to quickly determine the invalidated
objects?

Is it better to make trees of listeners to quickly determine the invalidated
listeners?

Well..... it depends. Usually, signal implementations are 'top-down' - each
changes directly triggers underlying listeners. The diffing methods are
'bottom-up' - each listeners directly determines the changes.

Obviously it won't matter if the number of changes / listeners are balanced
enough. However I'd say it's pretty okay to assume that top-down approach
is better, because it can very quickly find which listeners need to be
updated. Bottom-up approach does not have this luxury and instead have to
naively scan all the state to determine whether if the listener needs to be
triggered or not.

If we decide to use signals, the problem boils down to determine which signals
have changed quickly.

## Change detection
Whether if we want to implement change detection top-down or bottom-up, we need
to implement a method to detect the changes.

In order to do this, we have to add a version number, and list of listeners to
each "signals" - minimal subscribable units.

Whenever the data is changed, it should update the version number. This way,
other systems can read this version number and determine if it has changed.

## The version number
However, the version number itself can be painful to determine. It has to be
monotonically increasing; this is easily implemented in single-core CPU,
therefore it is trivial for JavaScript environment, but what about multi-core
environment?

We can use mutex, or any synchronization primitives to make it monotonic, but
this pretty much defeats the purpose of multi-core.

If we can see what each system tries to read/write, i.e. "topics", the version
number can instead use frame number / system number, because it doesn't have to
be updated/read every time.

## Data structure
Each component, and each entity, should store its own version number.
Whenever we change the data, we need to update these version numbers.

Furthermore, we need to quickly find which entity/component has changed.

This can be quickly determined using trees, each branch nodes storing
max(versionId) for its children.

This way, the signals can scan for differences whenever they want, quickly
enough because we don't have to traverse everything.

## The topic structure
The topics, and the corresponding listeners can be one of the following:
- An Entity.
- An Entity's Component.
- An EntityChunk.
- An EntityChunk's Component.
- An EntityGroup.
- An EntityGroup's Component.
- A Component.

Because their needs are wildly different, the optimial structure / algorithm
would differ between these topics.

The signal propagation hierarchy would be something like this - the main signal
emitter will scan through this structure and emit the associated listeners.

- EntityStore's components' skip-list to...
- EntityGroup's components' skip-list to...
- EntityChunk's components' skip-list to...
- Entity's components' skip-list

- EntityStore's skip-list to...
- EntityGroup's skip-list to...
- EntityChunk's skip-list to Entity

Because of this obnoxiously large number of indices, I don't think this is
*that* efficient at updating...

However, if we construct everything using skip-lists, this will only incur
O(log n) for each edit. ... Which is a lot, actually! O(n log n) is bearable,
but still, we want to find a faster way to do this.

To make skip-lists more efficient, we must process them in bulk, update only
when necessary, etc.

However if we think about that too much, nothing can be done, so let's just
move on with O(n log n). Ouch.

## What contains the version data?
Okay, we determined that we should manage skip-lists - I don't know, regular
arrays would suffice at this point - but, what should contain the version data?

The engine allows any data to be stored within the component, so it wouldn't
be possible to store the version information inside the component. Plus it will
get messy if we do that.

AFAIK Rust game libraries has luxury of mutable refs, so they can determine
if the data has changed by checking if the code has used mutable refs.

But we don't have that. We certainly don't want to store version info inside
the component too.

Well, there's only one solution. Let's store them inside the Entity,
EntityChunk, EntityGroup. EntityChunk would most benefit from skip-lists due
to the number of Entity it contains.

If the game logic calls the following, the version number will be retrieved from
the engine, and the numbers will set to the component, etc, which will propagate
to the EntityGroup.

Since we already reference EntityChunk and EntityGroup, hopefully we won't be
invalidating any CPU cache. (We won't know, due to the nature of JS.)

The following chain will update the entity and associated structures' version
numbers -

- The entity's component's version
- EntityChunk's component's version
- EntityGroup's component's version

- The entity's version
- EntityChunk's version
- EnttiyGroup's version

Well, that's a lot. Still, update and propagate the updates. Preferably we
would have two propagation methods here.

- _propagateAllUpdates(version) - Update *all* components. Used for entity
  addition/removal.
- _propagateComponentUpdates(compId, version) - Update only entities

## Signal Implementation
Unfortunately, there are too many layers in this! We need a way to generalize
signal handling logic, while allowing the nodes to traverse down, and ignoring
any unused listeners, etc.

Let's just pretend there are no listeners, but listeners call the EntityStore,
etc, to determine which entities has changed.

In this case, we need propagation logic and comparsion logic, which will boil
down to:

- `_propagate(version)`
- `forEachChanged(version, callback)`

The comparsion logic needs to aware of its children, of course. Due to this
requirement, I think we'd be better with implementing this as an interface.

If we have these, we can implement listeners too, using these two methods.

First, we need to attach listeners to each signals.

- `signal.add()`
- `signal.remove()`
- `getSignal(component).add()`
- `getSignal(component).remove()`

Then, we need a way to propagate the number of underlying listeners, so that we
can skip the unnecessary items. This is easily implemented by attaching
listeners to the parent when the signal is activated.

The engine will always emit the signal each frame - the EntityGroup listens
for that when necessary, check if it should fire, ..., which finally reaches the
entity.

But due to the nature of this mechanics, we won't be able to attach listeners
to every entity, but we only can attach to each topic, which is managed to
Engine, EntityGroup, etc.

This makes sense, because the signal doesn't have to bubble - the signal itself
only emits once per every frame. The affected entities can be found using
`forEachChanged` - so there's no reason to do this.
