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

## We need a AssetLibrary
Until this point, I've thought about integrating serialization method onto the
component store - however this is not a valid solution. There might be a lot of
different serialization methods - For example, GLTF, COLLADA, OBJ, STL, etc,
are all different formats with different serialization methods. We could convert
them to internal JSON format, and deserialize that - however, the GLTF, COLLADA,
etc formats are inherently "linked" - resources references to each other.

In this case, there is no actual benefit from making an internal serializable
format; we'd just ditch the middle man and convert from foreign format to
internal data directly.

In order to do that, we have to detach internal data and the engine, as
the internal data can be appended to the engine, even multiple times. Or the
internal data can be just read independently of the engine.

However, the engine currently do not allow such method. The component and the
data store is strongly bonded to the engine. This is not bad though - this
design is completely intended.

We can make a "subset" of the engine which conforms to the component interface,
however it can freely move the entities around - without hurting cross
references, so that deserializer can return the data using it.

In addition to the entities, the related resources, such as textures,
geometries, materials, etc, can also be carried in there.

This is then called an AssetLibrary, which is subset of the engine state and
can be appended to the engine if needed.

### Maintaining references
Parent hierarchy, Material ID, etc, are all references - it must be preserved
between entity movements. To support this, each component should be aware of
references and help them move around. For example, Hierarchy component may
detect other engine (AssetLibrary) reference and resolve them.

It can be resolved by nested copying - however this will easily end up in
infinite loop and we need a way to stop this behavior.

The engine itself, should support bulk appending and provide facility to detect
these references and resolve the foreign references to the engine itself.

The simplest way could be, while bulk appending, the reference may be rewritten
using a rewriter (In a sense, this is very similiar to EntityFuture), which
is provided by `bulkAppend` method. The assets also can be resolved in similiar
way, but it'd be more trickier.

## Conclusion
The EntityStore should be independent of the Engine. EntityStore may decide to
not manage EntityGroup, EntityChunk objects and just manage Entity array.

We may change the name of EntityStore to more inviting name like "EntityBundle",
however this is extremely confusing as there are simliarly named classes like
EntityGroup, EntityChunk, etc.

The EntityStore should support "append" method that can accept a list of Entity
from other EntityStore.

Component should be aware of other EntityStore while setting values. For
example, if Entity from another EntityStore is detected while appending, it
should be replaced to freshly copied Entity. This task should be done by a
mapper that is temporarily set while performing "append". The user may override
this to allow keeping references and forwarding to already-pasted references,
etc.

We assume that Component sets are the same between multiple EntityStore,
(or the source is subset of the destination) for now.

Managing other resources, such as Material, Texture, etc is not the scope of
EntityStore. However EntityStore may reference AssetLibrary, which is set while
creating the Component objects. The Component should be aware of resources from
other AssetLibrary, and copy them / rename them when necessary. The AssetLibrary
may provide some utilites to perform this task, as some kind of metadata is
anyway necessary for bookkeeping the resources. This is subject to change, as
specifing these resources may be problem in the future.

The serializer, deserializer should accept both AssetLibrary and EntityStore -
this set would be called as a "Bundle".
