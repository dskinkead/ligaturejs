# Ligature and React

Ligature and React solve overlapping UI problems with different defaults. This
comparison is guidance, not a benchmark claim; measure an application that
resembles yours before choosing a framework.

| Concern | Ligature | React |
| --- | --- | --- |
| First response | Server-rendered HTML is the primary artifact | Often paired with an SSR/SSG framework |
| Browser JavaScript | Optional progressive enhancement or islands | Component rendering normally runs in the browser |
| State ownership | Explicit local stores/resources and server actions | Hooks, context, and application libraries |
| HTML boundary | Components return trusted HTML using explicit escaping helpers | JSX is transformed and escaped by React |
| Routing/data | Explicit framework contracts and Express integration | Commonly supplied by a separate framework |
| Best fit | HTML-oriented, data-driven, server-first applications | Rich client applications and React ecosystem integrations |

Choose React when a large client-side component ecosystem, frequent client-only
interaction, or React-specific tooling is the primary constraint. Choose
Ligature when a useful response must exist without JavaScript, server ownership
and HTTP boundaries should be explicit, or a small browser runtime is enough.
Neither choice removes the need for accessibility, authorization, testing, or
careful data loading.

The supported boundary and explicit non-targets are maintained in
[SUPPORTED-TARGET.md](SUPPORTED-TARGET.md).
