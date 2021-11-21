# Virtual DOM and the Editor
In order to decouple the renderer and the editor state, we need to implement
virtual DOM. There is no other way - the state mutation is too extreme to handle
it manually.

The gizmo effects, event handling, etc, can all be handled using this virtual
DOM, though I'm not sure if we should implement all of them - it'd be just
enough to implement a list of `createElement`.

## Implementation
Well, simply put, the implementation should work on something like
`React.createElement`, operating on the state and the renderer.

The `EditorModeComponent` would inject sub-modes and inject effects, etc,
appropriately.

The resource handling, etc, is also manageable using React's state management
pattern.
