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


