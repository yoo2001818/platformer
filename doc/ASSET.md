# Asset management
The geometry, mesh, etc, should be stored within the state, however, this
information is not unique for each entity; The same information can be used
again and again.

To accomodate with this, we must provide a way to manage these reused assets,
with serialization, etc.

The GLTF specification uses index number for this purpose; similiar stuff can
be used within the serialized data. We can use URI for this purpose.

However, the mesh, geometry component, must accomodate this asset management.
The current engine structure allows each component to manipulate their own
data, so it should be no problem, however there is a problem with common asset
management interface. There must be a common way to manage this, and link it to
the engine / serialization layer.

## Mesh, Geometry, Material
Mesh, Geometry, Material, can reference non-serializable data. We need a way
to address them, and recall them when necessary.

A simplest solution would be creating a "recall" layer, which can generate a
necessary object from strings, config objects, etc.

This task would have to be done by MeshComponent, as all serialization will
go through it.

## EntityFuture
Currently the engine supports EntityFuture for serialization purposes. This
can be thought as asset management too, as the resource must be processed by
EntityFuture, rather than passing it through JSON serialization.

## The component itself should do it
Well, the path is clear - the component itself should perform all the
deserialization routine. However, the engine should provide a "asset map" for
managing the resources, as serialization routine doesn't provide a slot for
managing this resources. It can be just simple as providing an object,
outputting the entire object after serialization.

However, this also means that serialization / setting routine must be kept
separate, because the `create` method, will use different format from
`serialize`, `deserialize` routine.

Possibly, we can just make `pack`, `unpack` function in order to this to work.

## Interface

```tsx
interface Component {

  get(entity): T | null;
  set(entity, value: T);

  getJSON(entity, objMap): unknown;
  setJSON(entity, objMap, value): void;
}
```

...Other resources can be resolved like this, but other entity references can't
survive this, as the objMap needs to be populated with the entity list first
to reference others.

Furthermore, the objMap itself may not be serializable, so objMap needs to take
care of resources, preferably using a Map. But this is not relevant in
deserialization time.

For this reason, while calling `getJSON`, the objMap can be "enhanced" - it can
store indices, map, etc, for serialization purposes. But, when calling 
`setJSON`, it should be converted to JSON-serializable object.

Preferably, the objMap itself can handle all of this - so that getJSON, setJSON
uses same interface.

## Serialization methods
Okay, other components won't really matter - however, Mesh and Animation
component can choose to load the data from external sources. This means that
asynchronous loading is possible, and we should account for it.

During deserialization, we can just choose to load the resource asynchronously -
no problem. However, we need to determine if the resource should be saved along
with the file or not. We can choose to include it, or not.

While this should be selectable by the user (or the code), there should be some
sane defaults.

The Mesh, and the resources attached to it (geometry, material) should have
URI to determine where the resource came from. If it is not defined, it should
be considered as a local resource and saved along with the JSON.

If the resource is tampered and a fork was made from the original source, it
should lose the URI.

The mesh component should implement a protocol handler to handle various
protocols, and file types.
Since it should directly handle the file types, not only protocols, it is not
portable between animation component, etc. 
