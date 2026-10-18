export type PrimitivePropType = 'string'|'number'|'boolean'|'object'|'array'|'null'
export interface PropRule { type?: PrimitivePropType; required?: boolean; default?: unknown; coerce?: boolean }
export type PropValue<Rule extends PropRule> = Rule extends { type: 'string' } ? string : Rule extends { type: 'number' } ? number : Rule extends { type: 'boolean' } ? boolean : Rule extends { type: 'null' } ? null : Rule extends { type: 'array' } ? unknown[] : Rule extends { type: 'object' } ? Record<string, unknown> : unknown
export type PropsFromRules<Rules extends Record<string, PropRule>> = {
  [Name in keyof Rules as Rules[Name] extends { required: true } | { default: unknown } ? Name : never]-?: PropValue<Rules[Name]>
} & {
  [Name in keyof Rules as Rules[Name] extends { required: true } | { default: unknown } ? never : Name]?: PropValue<Rules[Name]>
}
export type ComponentEventMap<Component extends { events?: Record<string, string> }> = NonNullable<Component['events']>
export type ComponentSlotName<Component extends { slots?: readonly string[] }> = NonNullable<Component['slots']> extends readonly (infer Slot extends string)[] ? Slot : never
export type ComponentTypes<Rules extends Record<string, PropRule> = Record<string, PropRule>, Events extends Record<string, string> = Record<string, never>, Slots extends string = never> = { props: PropsFromRules<Rules>; events: Events; slots: Slots }
export interface PropIssue { name: string; code: 'missing'|'invalid_type'|'invalid_props'; expected?: string; received: string; message: string }
export class PropValidationError extends TypeError { component: string; issues: readonly PropIssue[] }
export interface LigatureContext<Value = unknown> { readonly name: string; readonly defaultValue: Value; readonly id: symbol }
export function createContext<Value = unknown>(name: string, defaultValue: Value): Readonly<LigatureContext<Value>>
export type RenderFragment = string | ((scope: Readonly<Record<string, unknown>>) => string)
export interface ComponentContext { readonly name: string; readonly instanceId: string; readonly children: Readonly<Record<string, RenderFragment>>; readonly slots: Readonly<Record<string, RenderFragment>>; readonly escape: { readonly text: typeof escapeText; readonly attribute: typeof escapeAttribute; readonly url: typeof escapeUrl; readonly style: typeof escapeStyle }; child(name: string, scope?: Record<string, unknown>): string; slot(name: string, scope?: Record<string, unknown>): string; consume<Value>(context: LigatureContext<Value>): Value; provide<Value, Result>(context: LigatureContext<Value>, value: Value, render: () => Result): Result; render(name: string, props?: Record<string, unknown>, options?: Record<string, unknown>): string }
export interface FocusOptions { preventScroll?: boolean }
export type KeyHandlers = Record<string, (event: KeyboardEvent) => void | false>
export interface FocusTrapOptions extends FocusOptions { initialFocus?: boolean; onEscape?: (event: KeyboardEvent) => void }
export type StateUpdater<State extends Record<string, unknown>> = Partial<State> | ((state: Readonly<State>) => Partial<State>)
export interface ClientLifecycleContext { readonly signal: AbortSignal; listen(target: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): () => void; delegate(target: Element, type: string, selector: string, handler: (event: Event, matched: Element) => void, options?: AddEventListenerOptions | boolean): () => void; keys(target: EventTarget, handlers: KeyHandlers, options?: AddEventListenerOptions | boolean): () => void; focus(element: Element, options?: FocusOptions): boolean; focusFirst(root: Element, options?: FocusOptions): Element | null; focusTrap(container: Element, options?: FocusTrapOptions): () => void; derive<Value>(key: string, compute: () => Value, dependencies?: readonly unknown[]): Value; setState<State extends Record<string, unknown>>(patch: StateUpdater<State>): Readonly<State>; emit(name: string, detail?: unknown, options?: { bubbles?: boolean; cancelable?: boolean }): boolean }
export interface LigatureRuntimeError extends Error { readonly name: 'LigatureRuntimeError'; readonly component: string; readonly location: string; readonly phase: 'load'|'mount'|'update'|'unmount'|'lifecycle'; readonly cause: Error }
export interface ComponentStyle { css: string; scope?: 'component'|'global'; layer?: string; order?: number; source?: string }
export interface ComponentDefinition<Rules extends Record<string, PropRule> = Record<string, PropRule>, Events extends Record<string, string> = Record<string, string>, Slots extends readonly string[] = readonly string[]> { name: string; version?: string; props?: Rules; events?: Events; styles?: string | ComponentStyle; /** @deprecated Use styles. */ css?: string | ComponentStyle; children?: Record<string, RenderFragment>; slots?: Slots; slotFallbacks?: Record<string, RenderFragment>; state?: () => Record<string, unknown>; errorBoundary?(error: unknown, props: PropsFromRules<Rules>, state: Record<string, unknown>, context: ComponentContext): string; render(props: PropsFromRules<Rules>, state?: Record<string, unknown>, context?: ComponentContext): string; mount?(element: Element, state: Record<string, unknown>, lifecycle?: ClientLifecycleContext): void; /** Enhance server-rendered DOM in place; this is optional and does not require hydration. */ enhance?(element: Element, state: Record<string, unknown>, lifecycle?: ClientLifecycleContext): void; update?(element: Element, props: PropsFromRules<Rules>, state: Record<string, unknown>, lifecycle?: ClientLifecycleContext): void; unmount?(element: Element, props: PropsFromRules<Rules>, state: Record<string, unknown>, lifecycle?: ClientLifecycleContext): void; client?: string | Record<string, unknown> }
export interface ComponentJsonSchema { $schema: string; $id: string; title: string; type: 'object'; properties: Record<string, Record<string, unknown>>; required?: string[]; additionalProperties: true }
export interface ComponentMetadata<Rules extends Record<string, PropRule> = Record<string, PropRule>> { readonly schema: 'ligaturejs.component-metadata.v1'; readonly name: string; readonly version: string; readonly props: Rules; readonly events: Readonly<Record<string, string>>; readonly slots: readonly string[]; readonly slotFallbacks: readonly string[]; readonly children: readonly string[]; readonly lifecycle: readonly string[]; readonly hasClient: boolean; readonly jsonSchema: Readonly<ComponentJsonSchema> }
export function componentSchema<Rules extends Record<string, PropRule> = Record<string, PropRule>>(component: ComponentDefinition<Rules>): Readonly<ComponentJsonSchema>
export function componentMetadata<Rules extends Record<string, PropRule> = Record<string, PropRule>>(component: ComponentDefinition<Rules>): Readonly<ComponentMetadata<Rules>>
export function componentContract(component: ComponentDefinition): Readonly<{ name: string; version: string; props: Record<string, PropRule>; events: Readonly<Record<string, string>>; styles?: string | ComponentStyle; slots: readonly string[]; slotFallbacks: readonly string[]; children: readonly string[]; lifecycle: readonly string[]; hasErrorBoundary: boolean }>
export function defineComponent<Rules extends Record<string, PropRule> = Record<string, PropRule>, Events extends Record<string, string> = Record<string, string>, Slots extends readonly string[] = readonly string[]>(definition: ComponentDefinition<Rules, Events, Slots>): Readonly<ComponentDefinition<Rules, Events, Slots>>
export function validateProps<Rules extends Record<string, PropRule> = Record<string, PropRule>>(component: ComponentDefinition<Rules>, props?: Record<string, unknown>): PropsFromRules<Rules> & Record<string, unknown>
export function escapeHtml(value: unknown): string
export function escapeText(value: unknown): string
export function escapeAttribute(value: unknown): string
export function escapeUrl(value: unknown): string
export function escapeStyle(value: unknown): string
export interface DialogProps { role: 'dialog'; 'aria-modal': 'true'|'false'; 'aria-labelledby'?: string; 'aria-describedby'?: string }
export function dialogProps(options?: { modal?: boolean; labelledBy?: string; describedBy?: string }): Readonly<DialogProps>
export function menuProps(options?: { label?: string; labelledBy?: string }): Readonly<{ role: 'menu'; 'aria-label'?: string; 'aria-labelledby'?: string }>
export function menuItemProps(options?: { disabled?: boolean }): Readonly<{ role: 'menuitem'; tabindex: '0'|'-1'; 'aria-disabled'?: 'true' }>
export function tabsProps(options: { tabId: string; panelId: string; label?: string; selected?: boolean }): Readonly<{ tablist: Readonly<Record<string, string>>; tab: Readonly<Record<string, string>>; panel: Readonly<Record<string, string|boolean>> }>
export function fieldProps(options: { id: string; describedBy?: string; errorId?: string; invalid?: boolean; required?: boolean }): Readonly<Record<string, string>>
export function notificationProps(options?: { urgent?: boolean }): Readonly<{ role: 'status'|'alert'; 'aria-live': 'polite'|'assertive'; 'aria-atomic': 'true' }>
export function focusVisibleCss(): string
export function sanitizeHtml(value: string): string
export const rawHtml: typeof sanitizeHtml
export interface BoltContext { readonly name: string; readonly parent: string | null; readonly escape: { readonly text: typeof escapeText; readonly attribute: typeof escapeAttribute; readonly url: typeof escapeUrl; readonly style: typeof escapeStyle }; bolt(name: string, data?: unknown, options?: Record<string, unknown>): string }
export interface BoltRenderDefinition { readonly name: string; readonly version: string; readonly props: Readonly<Record<string, unknown>>; readonly template?: undefined; readonly render: (data: unknown, context: BoltContext) => string }
export interface BoltTemplateDefinition { readonly name: string; readonly version: string; readonly props: Readonly<Record<string, unknown>>; readonly template: string; readonly render?: undefined }
export type BoltDefinition = BoltRenderDefinition | BoltTemplateDefinition
export class BoltRenderError extends Error { readonly bolt: string; readonly cause: unknown }
export class BoltTemplateError extends Error { readonly bolt: string; readonly expression: string; readonly cause: unknown }
export function defineBolt(definition: { name: string; version?: string; props?: Record<string, unknown>; render(data: unknown, context: BoltContext): string; template?: undefined }): Readonly<BoltRenderDefinition>
export function defineBolt(definition: { name: string; version?: string; props?: Record<string, unknown>; template: string; render?: undefined }): Readonly<BoltTemplateDefinition>
export interface BoltManifestEntry { readonly schema: 'ligaturejs.bolt-metadata.v1'; readonly name: string; readonly version: string; readonly props: Readonly<Record<string, unknown>>; readonly mode: 'render'|'template'; readonly hasTemplate: boolean }
export interface BoltRegistry { register(bolt: BoltDefinition): this; get(name: string): BoltDefinition; render(name: string, data?: unknown, options?: { parent?: string | null }): string; manifest(): BoltManifestEntry[] }
export function createBoltRegistry(): BoltRegistry
export interface ControlOptions<Value = unknown> { value?: Value; defaultValue?: Value; onChange?: (value: Value) => void }
export interface Control<Value = unknown> { readonly controlled: boolean; readonly value: Value | undefined; set(value: Value): Value; sync(value: Value): Value | undefined; reset(): Value | undefined }
export function createControl<Value = unknown>(options?: ControlOptions<Value>): Readonly<Control<Value>>
export type StoreUpdater<State extends Record<string, unknown>> = Partial<State> | ((state: Readonly<State>) => Partial<State>)
export interface Store<State extends Record<string, unknown>> { readonly state: Readonly<State>; update(patch: StoreUpdater<State>): Readonly<State>; subscribe(listener: (state: Readonly<State>) => void): () => boolean; reset(): Readonly<State> }
export function createStore<State extends Record<string, unknown> = Record<string, unknown>>(initialState?: State): Readonly<Store<State>>
export interface OptimisticState<Data = unknown> { readonly data: Data; readonly pending: boolean; readonly error: unknown | null }
export interface Optimistic<Data = unknown> { readonly state: Readonly<OptimisticState<Data>>; update<Next = Data>(update: (previous: Data) => Next, mutation: (optimistic: Next) => Next | void | PromiseLike<Next | void>): Promise<Next>; rollback(error?: unknown): Readonly<OptimisticState<Data>>; subscribe(listener: (state: Readonly<OptimisticState<Data>>) => void): () => boolean }
export function createOptimistic<Data = unknown>(initialState: Data): Readonly<Optimistic<Data>>
export type ResourceStatus = 'idle'|'loading'|'success'|'error'|'stale'
export interface ResourceState<Value = unknown> { readonly status: ResourceStatus; readonly data: Value | undefined; readonly error: unknown | null }
export interface Resource<Value = unknown> { readonly state: Readonly<ResourceState<Value>>; load(): Promise<Value>; invalidate(): Readonly<ResourceState<Value>>; reset(): Readonly<ResourceState<Value>>; subscribe(listener: (state: Readonly<ResourceState<Value>>) => void): () => boolean }
export interface ResourceOptions<Value = unknown> { initialData?: Value }
export function createResource<Value = unknown>(loader: () => Value | PromiseLike<Value>, options?: ResourceOptions<Value>): Readonly<Resource<Value>>
export interface ResourceCache { resource<Value = unknown>(key: string, loader: () => Value | PromiseLike<Value>, options?: ResourceOptions<Value>): Readonly<Resource<Value>>; get<Value = unknown>(key: string): Readonly<Resource<Value>> | undefined; invalidate(key?: string): Readonly<ResourceCache>; revalidate<Value = unknown>(key?: string): Promise<Value | Value[]> }
export function createResourceCache(): Readonly<ResourceCache>
export interface StateInspector { readonly state: Readonly<Record<string, unknown>>; track(name: string, source: { readonly state: unknown; subscribe(listener: (state: unknown) => void): () => boolean }): () => Readonly<StateInspector>; untrack(name: string): Readonly<StateInspector>; subscribe(listener: (state: Readonly<Record<string, unknown>>) => void): () => boolean }
export function createStateInspector(): Readonly<StateInspector>
export type FormErrors = Record<string, unknown>
export interface FormState<Values extends Record<string, unknown> = Record<string, unknown>> { readonly values: Readonly<Values>; readonly initialValues: Readonly<Values>; readonly touched: Readonly<Record<string, boolean>>; readonly errors: Readonly<FormErrors>; readonly dirty: boolean; readonly submitting: boolean; readonly submitted: boolean }
export interface FormOptions<Values extends Record<string, unknown> = Record<string, unknown>> { validate?: (values: Readonly<Values>) => FormErrors; onSubmit?: (values: Readonly<Values>) => void | PromiseLike<void> }
export interface Form<Values extends Record<string, unknown> = Record<string, unknown>> { readonly state: Readonly<FormState<Values>>; set<Name extends string, Value>(name: Name, value: Value): Readonly<FormState<Values & Record<Name, Value>>>; touch(name: string, touched?: boolean): Readonly<FormState<Values>>; validate(): Readonly<FormErrors>; submit(): Promise<boolean>; reset(values?: Values): Readonly<FormState<Values>>; subscribe(listener: (state: Readonly<FormState<Values>>) => void): () => boolean }
export function createForm<Values extends Record<string, unknown> = Record<string, unknown>>(initialValues?: Values, options?: FormOptions<Values>): Readonly<Form<Values>>
export type UpdateInPath = readonly (string | number)[]
export type UpdateInLeaf<Value, Path extends UpdateInPath> = Path extends readonly [infer Head, ...infer Tail] ? Head extends keyof Value ? UpdateInLeaf<Value[Head], Extract<Tail, UpdateInPath>> : unknown : Value
export function updateIn<Value, Path extends UpdateInPath, Result>(value: Value, path: Path, updater: (value: UpdateInLeaf<Value, Path>) => Result): Result
export interface ClientRuntimeOptions { development?: boolean; minified?: boolean }
export function clientRuntime(options?: ClientRuntimeOptions): string
export function componentClientSource(component: ComponentDefinition): string
export interface KeyedListOptions<Item = unknown> { key: (item: Item, index: number) => string | number; render: (item: Item, index: number) => Element; update?: (element: Element, item: Item, index: number) => void }
export interface LigatureClientRuntime { focus(element: Element, options?: FocusOptions): boolean; focusFirst(root: Element, options?: FocusOptions): Element | null; keys(target: EventTarget, handlers: KeyHandlers, options?: AddEventListenerOptions | boolean): () => void; trapFocus(container: Element, options?: FocusTrapOptions): () => void; updateList<Item = unknown>(root: Element, items: readonly Item[], options: KeyedListOptions<Item>): Element; updateIn: typeof updateIn }
export function createComponentRegistry(): { register(component: ComponentDefinition): unknown; get(name: string): ComponentDefinition; render(name: string, props?: Record<string, unknown>, options?: { id?: string; state?: Record<string, unknown>; children?: Record<string,RenderFragment>; slots?: Record<string,RenderFragment>; providers?: Map<LigatureContext<unknown>, unknown> }): string; manifest(): unknown[]; assets(): unknown[] }
export function markupSignature(value: string): string
export function ligatureMiddleware(registry: unknown, options?: { prefix?: string; runtime?: ClientRuntimeOptions }): (req: unknown, res: unknown, next: () => void) => void
/** @deprecated Use ligatureMiddleware. */
export const agentTagsMiddleware: typeof ligatureMiddleware
export interface RouteDefinition {
  readonly method: string
  readonly path: string
  readonly auth: boolean
  readonly input: Record<string, string>
  readonly output: Record<string, unknown>
  readonly middleware: readonly ((context: Record<string, unknown>, next: (context: Record<string, unknown>) => unknown) => unknown)[]
  readonly loader?: (context: RouteContext) => unknown | PromiseLike<unknown>
  readonly action?: (context: RouteContext) => unknown | PromiseLike<unknown>
  readonly authorize?: (context: { req: unknown; user: unknown }) => boolean | PromiseLike<boolean>
  readonly errorBoundary?: (context: { error: unknown; req: unknown; res: unknown }) => unknown | PromiseLike<unknown>
  readonly layouts: readonly ((context: RouteContext & { result: unknown; next: () => unknown }) => unknown | PromiseLike<unknown>)[]
  readonly handle?: (context: RouteContext) => unknown | PromiseLike<unknown>
  readonly match: (pathname: string) => Record<string, string> | null
}
export interface RouteContext { req: unknown; user: unknown; input: Record<string, unknown>; params: Record<string, string>; query: Record<string, string|string[]>; repositories: Record<string, unknown>; data?: unknown }
export interface TypedRouteContext<Params extends Record<string, string> = Record<string, string>, Input extends Record<string, unknown> = Record<string, unknown>, Data = unknown> extends Omit<RouteContext, 'input'|'params'|'data'> { readonly input: Input; readonly params: Params; readonly data?: Data }
export interface RouteContract<Params extends Record<string, string> = Record<string, string>, Input extends Record<string, unknown> = Record<string, unknown>, Data = unknown> {
  readonly method: string
  readonly path: string
  readonly handle?: (context: TypedRouteContext<Params, Input, Data>) => unknown | PromiseLike<unknown>
  readonly loader?: (context: TypedRouteContext<Params, Input, Data>) => Data | PromiseLike<Data>
  readonly action?: (context: TypedRouteContext<Params, Input, Data>) => unknown | PromiseLike<unknown>
  readonly authorize?: (context: Pick<TypedRouteContext<Params, Input, Data>, 'req'|'user'>) => boolean | PromiseLike<boolean>
}
export function defineRoute(definition: { method: string; path: string; auth?: boolean; input?: Record<string, string>; output?: Record<string, unknown>; middleware?: RouteDefinition['middleware']; handle?: RouteDefinition['handle']; loader?: RouteDefinition['loader']; action?: RouteDefinition['action']; authorize?: RouteDefinition['authorize']; errorBoundary?: RouteDefinition['errorBoundary']; layout?: RouteDefinition['layouts'][number]; layouts?: RouteDefinition['layouts'] }): Readonly<RouteDefinition>
export function defineRoute<Params extends Record<string, string>, Input extends Record<string, unknown> = Record<string, unknown>, Data = unknown>(definition: RouteContract<Params, Input, Data> & Omit<Parameters<typeof defineRoute>[0], 'handle'|'loader'|'action'|'authorize'>): Readonly<RouteDefinition> & Readonly<RouteContract<Params, Input, Data>>
export function routeManifest(routes: readonly RouteDefinition[]): ReadonlyArray<{ method: string; path: string; auth: boolean; input: Record<string, string>; output: Record<string, unknown> }>
export function matchRoute(route: RouteDefinition, pathname: string): Record<string, string> | null
export function redirect(location: string, status?: 301|302|303|307|308): Readonly<{ status: number; headers: Readonly<{ Location: string }>; body: string }>
export interface SignedReturnOptions { ttlSeconds?: number; now?: number; endpoint?: string; parameter?: string; status?: 301|302|303|307|308 }
export function signReturnTo(location: string, secret: string|Uint8Array, options?: Pick<SignedReturnOptions, 'ttlSeconds'|'now'>): string
export function verifyReturnTo(token: string, secret: string|Uint8Array, options?: Pick<SignedReturnOptions, 'now'>): string|null
export function signedRedirect(location: string, secret: string|Uint8Array, options?: SignedReturnOptions): Readonly<{ status: number; headers: Readonly<{ Location: string }>; body: string }>
export const signRedirect: typeof signReturnTo
export const verifyRedirect: typeof verifyReturnTo
export function createRouter(routes: readonly RouteDefinition[], options?: { notFound?: (req: unknown, res: unknown, next?: unknown) => unknown }): (req: unknown, res: unknown, next: (route: RouteDefinition) => unknown) => Promise<unknown>
export function createRouteHandler(route: RouteDefinition, context?: { authenticate?: (req: unknown) => unknown | PromiseLike<unknown>; repositories?: Record<string, unknown> }): (req: unknown, res: unknown, next?: (error?: unknown) => unknown) => Promise<unknown>
export function routeNotFound(message?: string): Error
export function methodNotAllowed(message?: string): Error
export function validateInput(schema: Record<string,string>, value?: Record<string, unknown>): Record<string, unknown>
export interface ValidationBoundary<Value = unknown> { http(value: Value): Value; domain(value: Value): Value; persistence(value: Value): Value }
export function createValidationBoundary<Value = unknown>(validators?: { http?: (value: Value) => Value; domain?: (value: Value) => Value; persistence?: (value: Value) => Value }): Readonly<ValidationBoundary<Value>>
export function paginate<Row>(rows: readonly Row[], options?: { page?: number; pageSize?: number }): Readonly<{ items: Row[]; page: number; pageSize: number; total: number; pages: number }>
export function queryOptions(options?: { filter?: (row: unknown) => boolean; sort?: (a: unknown, b: unknown) => number; page?: number; pageSize?: number }): Readonly<Record<string, unknown>>
export function queryRows<Row>(rows: readonly Row[], options?: { filter?: (row: Row) => boolean; sort?: (a: Row, b: Row) => number; search?: string; searchFields?: readonly string[]; page?: number; pageSize?: number }): Row[]
export function scopedRepository<Methods extends RepositoryMethods>(repository: Repository<Methods>, authorize: (context: unknown) => boolean | PromiseLike<boolean>): Readonly<Repository<Methods>>
export interface RepositoryMethod<Args extends readonly unknown[] = readonly unknown[], Result = unknown> { (...args: Args): Result | PromiseLike<Result> }
export type RepositoryMethods = Record<string, RepositoryMethod>
export interface RepositoryDefinition<Methods extends RepositoryMethods = RepositoryMethods> { name: string; methods: Methods }
export type Repository<Methods extends RepositoryMethods = RepositoryMethods> = Readonly<{ name: string; methods: Readonly<Methods> }>
/** A vendor-neutral application boundary; methods own domain semantics, not SQL/driver details. */
export function defineRepository<Methods extends RepositoryMethods = RepositoryMethods>(definition: RepositoryDefinition<Methods>): Repository<Methods>
export interface DatabaseAdapter<Row = Record<string, unknown>> {
  query<T = Row>(operation: string, ...parameters: readonly unknown[]): Promise<readonly T[]>
  execute?(operation: string, ...parameters: readonly unknown[]): unknown | PromiseLike<unknown>
  begin(): void | PromiseLike<void>
  commit(): void | PromiseLike<void>
  rollback(): void | PromiseLike<void>
  close?(): void | PromiseLike<void>
}
export interface DatabaseEvent { readonly type: 'slow-query'|'query-error'|'transaction-error'; readonly method: string; readonly duration: number; readonly operation?: unknown; readonly error?: unknown }
export function observeDatabase<Row = Record<string, unknown>>(adapter: DatabaseAdapter<Row>, options: { onEvent: (event: DatabaseEvent) => void; slowQueryMs?: number }): Readonly<DatabaseAdapter<Row>>
export function defineDatabaseAdapter<Row = Record<string, unknown>>(adapter: DatabaseAdapter<Row>): Readonly<DatabaseAdapter<Row>>
export function createMemoryDatabase<Row = Record<string, unknown>>(initial?: Record<string, readonly Row[]>): Readonly<DatabaseAdapter<Row>>
export function createSqliteAdapter(database: { prepare(statement: string): { all(...params: unknown[]): readonly Record<string, unknown>[]; run(...params: unknown[]): unknown }; exec(statement: string): unknown; close?(): void }): Readonly<DatabaseAdapter>
export function createMysqlAdapter(connection: { query(statement: string, params?: readonly unknown[]): Promise<[unknown, unknown]>; beginTransaction(): Promise<void>; commit(): Promise<void>; rollback(): Promise<void>; end?(): Promise<void> }): Readonly<DatabaseAdapter>
export function withTransaction<Result>(adapter: Pick<DatabaseAdapter, 'begin'|'commit'|'rollback'>, work: (adapter: typeof adapter, context: { attempt: number; signal?: AbortSignal }) => Result | PromiseLike<Result>, options?: { retries?: number; timeout?: number; signal?: AbortSignal; retryOn?: (error: unknown, attempt: number) => boolean }): Promise<Result>
export function withConnection<Result>(adapter: Pick<DatabaseAdapter, 'close'>, work: (adapter: typeof adapter) => Result | PromiseLike<Result>): Promise<Result>
export interface Migration { readonly id: string; readonly description: string; readonly up: (adapter: unknown) => unknown | PromiseLike<unknown>; readonly down: (adapter: unknown) => unknown | PromiseLike<unknown> }
export function defineMigration(definition: Omit<Migration, 'id'|'description'> & Pick<Migration, 'id'|'description'>): Readonly<Migration>
export function migrationManifest(migrations: readonly Migration[]): ReadonlyArray<Pick<Migration, 'id'|'description'>>
export function planMigrations(migrations: readonly Migration[], applied?: readonly string[]): Promise<readonly Migration[]>
export function applyMigrations(migrations: readonly Migration[], adapter: unknown, applied?: string[]): Promise<readonly string[]>
export function migrationStatus(migrations: readonly Migration[], applied?: readonly string[]): ReadonlyArray<Readonly<{ id: string; description: string; applied: boolean }>>
export function rollbackMigration(migrations: readonly Migration[], adapter: unknown, applied?: string[]): Promise<readonly string[]>
export function assetVersion(source: string): string
export function assetUrl(prefix: string, name: string, source: string, extension?: string): string
export interface AssetDescriptor { readonly name: string; readonly type: string; readonly source: string; readonly version: string; readonly url: string; readonly cacheControl: string }
export function assetDescriptor(options: { prefix?: string; name: string; type?: string; source?: string; extension?: string }): Readonly<AssetDescriptor>
export function importAsset(options: { prefix?: string; name: string; source: string; type?: string; extension?: string; sanitize?: boolean }): Readonly<AssetDescriptor>
export function sanitizeSvg(value: string): string
export function preloadLink(asset: AssetDescriptor, options?: { as?: 'font'|'image'|'script'|'style'|'fetch'; crossorigin?: boolean }): string
export interface CriticalCss { readonly css: string; readonly bytes: number; readonly version: string }
export function criticalCss(source: string, options?: { maxBytes?: number }): Readonly<CriticalCss>
export interface Theme { readonly name: string; readonly tokens: Readonly<Record<string, string>>; readonly dark: Readonly<Record<string, string>>; readonly reducedMotion: Readonly<Record<string, string>>; readonly css: string }
export function defineTheme(name: string, definition?: { tokens?: Record<string, unknown>; dark?: Record<string, unknown>; reducedMotion?: Record<string, unknown> }): Readonly<Theme>
export function themeCss(tokens: Record<string, unknown>, options?: { selector?: string; dark?: Record<string, unknown>; reducedMotion?: Record<string, unknown> }): string
export interface StyleBundle { readonly css: string; readonly hash: string; readonly map?: { version: 3; file: string; sources: string[]; names: string[]; mappings: string } }
export function bundleStyles(components: readonly ComponentDefinition[], options?: { file?: string; sourceMap?: boolean }): Readonly<StyleBundle>
export function createApplicationManifest(input: Record<string, unknown>): Record<string, unknown>
export interface LigatureConfig {
  readonly server: string
  readonly buildDir: string
  readonly port: number
  readonly host: string
  readonly watch: boolean
  readonly file?: string|null
}
export function validateConfig(value?: Record<string, unknown>): Readonly<LigatureConfig>
export function loadConfig(dir?: string, overrides?: Partial<LigatureConfig>): Promise<Readonly<LigatureConfig>>
export const defaultConfig: Readonly<Omit<LigatureConfig, 'file'>>
export interface BuildFile { readonly file: string; readonly bytes: number; readonly sha256: string }
export interface BuildManifest { readonly schema: 'ligaturejs.build.v1'; readonly name?: string; readonly version?: string; readonly config: Readonly<Pick<LigatureConfig, 'server'|'port'|'host'>>; readonly files: readonly BuildFile[] }
export function buildProject(dir?: string, options?: { output?: string } & Partial<LigatureConfig>): Promise<{ readonly output: string; readonly manifest: BuildManifest }>
export function inspectBuild(dir: string): { readonly ok: boolean; readonly errors: readonly string[]; readonly manifest?: BuildManifest }
export interface ActionDefinition { name: string; method?: string; auth?: boolean; input?: Record<string, string>; status?: number; handle(context: { req: unknown; user: unknown; input: Record<string, unknown>; repositories: Record<string, unknown> }): unknown | PromiseLike<unknown> }
export function defineAction(definition: ActionDefinition): Readonly<ActionDefinition>
export function actionManifest(actions: readonly ActionDefinition[]): ReadonlyArray<{ name: string; method: string; auth: boolean; input: Record<string, string> }>
export function createActionHandler(action: ActionDefinition, context?: { authenticate?: (req: unknown) => unknown | PromiseLike<unknown>; repositories?: Record<string, unknown>; csrf?: { methods?: string[] } }): (req: unknown, res: unknown, next?: () => void) => Promise<unknown>
export class LigatureError extends Error { readonly code: string; readonly details: Readonly<Record<string, unknown>> }
export function badRequest(message: string, details?: Record<string, unknown>): LigatureError
export interface Logger { debug(message: string, details?: Record<string, unknown>): void; info(message: string, details?: Record<string, unknown>): void; warn(message: string, details?: Record<string, unknown>): void; error(message: string, details?: Record<string, unknown>): void; child(context?: Record<string, unknown>): Logger }
export function createLogger(name?: string, output?: Pick<Console, 'debug'|'info'|'warn'|'error'>, context?: Record<string, unknown>): Logger
export function inspectProject(dir?: string): { readonly ok: boolean; readonly errors: readonly string[] }
export function releaseReport(dir?: string): { readonly ok: boolean; readonly package: Readonly<{ name?: string; version?: string }>; readonly contract: { readonly ok: boolean; readonly errors: readonly string[] }; readonly audit: Readonly<Record<string, number>> | null }
export function diagnosticsMiddleware(options?: { name?: string; version?: string; checks?: Record<string, () => boolean | PromiseLike<boolean>>; logger?: Logger }): (req: unknown, res: unknown, next: () => unknown) => Promise<unknown>
export function requestIdMiddleware(options?: { logger?: Logger }): (req: unknown, res: unknown, next: () => unknown) => unknown
export interface MetricsSnapshot { readonly counters: Readonly<Record<string, number>>; readonly durations: Readonly<Record<string, readonly number[]>> }
export interface Metrics { increment(name: string, labels?: Record<string, string>, amount?: number): void; observe(name: string, value: number, labels?: Record<string, string>): void; recordRender(duration: number, labels?: Record<string, string>): void; recordAsset(type: string, labels?: Record<string, string>): void; recordFailure(kind?: string, labels?: Record<string, string>): void; middleware(): (req: unknown, res: unknown, next: () => unknown) => unknown; snapshot(): MetricsSnapshot }
export function createMetrics(): Metrics
export function errorReportingMiddleware(options: { report: (details: { error: unknown; requestId?: string; method?: string; path?: string }) => unknown | PromiseLike<unknown>; logger?: Logger }): (error: unknown, req: unknown, res: unknown, next: (error: unknown) => unknown) => Promise<unknown>
export interface ShutdownManager { readonly closed: boolean; shutdown(signal?: string): Promise<boolean>; install(processLike?: { once: Function; removeListener?: Function }, signals?: readonly string[]): () => void }
export function createShutdownManager(options?: { servers?: readonly { close(callback?: (error?: unknown) => void): unknown }[]; closeTimeoutMs?: number; onShutdown?: (signal?: string) => unknown | PromiseLike<unknown>; logger?: Logger }): ShutdownManager
export function checkApplication(input: { manifest: Record<string, unknown>; components?: readonly ComponentDefinition[]; routes?: readonly RouteDefinition[]; migrations?: readonly Migration[] }): { readonly ok: boolean; readonly errors: readonly string[] }
export function csrfToken(session?: Record<string, unknown>): string
export function verifyCsrf(session: Record<string, unknown> | undefined, token: unknown): boolean
export function csrfMiddleware(options?: { methods?: readonly string[] }): (req: unknown, res: unknown, next: () => unknown) => unknown
export function sessionContract(options?: { cookieName?: string; sameSite?: 'lax'|'strict'|'none'; secure?: boolean; maxAge?: number; idleTimeout?: number; rolling?: boolean; path?: string }): Readonly<{ cookieName: string; httpOnly: true; sameSite: string; secure: boolean; maxAge: number; idleTimeout: number; rolling: boolean; path: string }>
export interface SessionManager { readonly contract: ReturnType<typeof sessionContract>; create(data?: Record<string, unknown>): Readonly<{ id: string; data: Readonly<Record<string, unknown>> }>; get(id: string): Readonly<{ id: string; data: Readonly<Record<string, unknown>> }> | null; rotate(id: string): Readonly<{ id: string; data: Readonly<Record<string, unknown>> }>|null; destroy(id: string): boolean; size(): number }
export function createSessionManager(options?: Parameters<typeof sessionContract>[0] & { now?: () => number }): Readonly<SessionManager>
export function securityHeaders(options?: { contentSecurityPolicy?: string; referrerPolicy?: string; frameOptions?: string; hsts?: boolean; hstsMaxAge?: number }): (req: unknown, res: unknown, next: () => unknown) => unknown
export function createAuthorization(options: { authenticate: (req: unknown) => unknown | PromiseLike<unknown>; authorize: (context: { user: unknown; req: unknown }) => boolean | PromiseLike<boolean> }): Readonly<{ authenticate: typeof options.authenticate; authorize: typeof options.authorize; middleware: (req: unknown, res: unknown, next: () => unknown) => Promise<unknown> }>
export function validateUpload(file: Record<string, unknown>, options?: { maxBytes?: number; mimeTypes?: readonly string[]; extensions?: readonly string[] }): Readonly<{ name: string; type: string; size: number; extension: string }>
export function isolatedUploadPath(root: string, fileName: string): string
export function createRateLimiter(options?: { windowMs?: number; max?: number; key?: (req: unknown) => string }): (req: unknown, res: unknown, next: () => unknown) => unknown
export function inspectUpgrade(dir?: string): { readonly ok: boolean; readonly errors: readonly string[]; readonly current: string | null; readonly target: string; readonly needed?: boolean }
export function upgradeProject(dir?: string, options?: { check?: boolean }): ReturnType<typeof inspectUpgrade> & { readonly changed?: boolean; readonly manifest?: Readonly<Record<string, unknown>> }
export const frameworkVersion: string
export const frameworkTarget: Readonly<{
  schema: 'ligaturejs.target.v1';
  architecture: 'server-first';
  application: 'html-oriented';
  enhancement: 'progressive';
  hydration: 'optional';
  clientJavaScript: 'optional';
}>
export const frameworkSupport: Readonly<{
  schema: 'ligaturejs.support.v1';
  server: Readonly<{
    runtime: 'Node.js';
    minimum: '22.13.0';
    supportedMajors: readonly ('22.x'|'24.x')[];
    operatingSystems: readonly string[];
  }>;
  browser: Readonly<{
    policy: 'evergreen';
    minimumVersions: Readonly<{
      chromium: '109';
      firefox: '115';
      safari: '16.4';
    }>;
    operatingSystems: readonly string[];
  }>;
  verification: Readonly<{
    nodeCi: readonly ('22.13.0'|'22.x'|'24.x')[];
    browserCi: 'Chromium via Playwright';
  }>;
}>
export const frameworkCompatibility: Readonly<{
  schema: 'ligaturejs.compatibility.v1';
  publicSurface: readonly string[];
  undocumentedSurface: string;
  apiChanges: string;
  schemaChanges: string;
  deprecations: Readonly<{
    announcement: string;
    replacement: string;
    removal: string;
    securityException: string;
  }>;
}>
export const frameworkRelease: Readonly<{
  schema: 'ligaturejs.release.v1';
  versioning: Readonly<{
    standard: 'SemVer 2.0.0';
    pre1_0: Readonly<{
      breaking: 'increment minor';
      feature: 'increment minor';
      fix: 'increment patch';
      compatibility: 'not guaranteed across minor releases';
    }>;
    stable: Readonly<{
      breaking: 'increment major';
      feature: 'increment minor';
      fix: 'increment patch';
    }>;
  }>;
  support: Readonly<{
    pre1_0: string;
    stableCurrentMajor: string;
    stablePreviousMajor: string;
    prerelease: string;
  }>;
}>

export const frameworkFeatureStatus: Readonly<{
  schema: 'ligaturejs.feature-status.v1';
  statuses: readonly ['stable', 'experimental', 'planned', 'unsupported'];
  features: readonly Readonly<{
    id: string;
    area: string;
    status: 'stable'|'experimental'|'planned'|'unsupported';
    summary: string;
  }>[];
}>

export const pluginContract: Readonly<{ schema: 'ligaturejs.plugin.v1'; version: 1; lifecycle: readonly ['install', 'uninstall']; compatibility: string }>
export interface LigaturePlugin { readonly schema: 'ligaturejs.plugin.v1'; readonly name: string; readonly version: string; readonly install: (api: unknown) => unknown; readonly uninstall?: (api: unknown) => unknown | PromiseLike<unknown> }
export function definePlugin(definition: { name: string; version?: string; install: (api: unknown) => unknown; uninstall?: (api: unknown) => unknown | PromiseLike<unknown> }): Readonly<LigaturePlugin>
export interface PluginRegistry { register(plugin: LigaturePlugin): PluginRegistry; close(): Promise<void>; get(name: string): LigaturePlugin | undefined; list(): readonly { readonly name: string; readonly version: string }[] }
export function createPluginRegistry(options?: { api?: unknown; plugins?: readonly LigaturePlugin[] }): PluginRegistry
export const Button: Readonly<ComponentDefinition>
export const Alert: Readonly<ComponentDefinition>
export const Field: Readonly<ComponentDefinition>
export const componentLibrary: Readonly<{ Button: typeof Button; Alert: typeof Alert; Field: typeof Field }>
