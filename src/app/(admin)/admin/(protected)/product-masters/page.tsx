import Link from "next/link";
import { AdminFormSubmit } from "@/components/admin/admin-form-submit";
import type { Application, AttributeDefinition, AttributeValue, Size, SpecificationDefinition } from "@/generated/prisma/client";
import { saveProductMaster } from "@/server/admin/product-master-actions";
import { getDb } from "@/server/db";
import styles from "@/components/admin/admin-form.module.css";

type Query = { type?: string; edit?: string; error?: string; saved?: string };
const kinds = ["FINISH", "SURFACE", "COLOUR", "LOOK", "MATERIAL", "ROOM", "USAGE", "CUSTOM"] as const;
export const dynamic = "force-dynamic";

export default async function ProductMastersPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  let definitions: Array<AttributeDefinition & { values: AttributeValue[] }> = [];
  let sizes: Size[] = [];
  let applications: Application[] = [];
  let specifications: SpecificationDefinition[] = [];
  let unavailable = false;
  try {
    const db = getDb();
    [definitions, sizes, applications, specifications] = await Promise.all([
      db.attributeDefinition.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { values: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } } }),
      db.size.findMany({ orderBy: { label: "asc" } }),
      db.application.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      db.specificationDefinition.findMany({ orderBy: { label: "asc" } }),
    ]);
  } catch (error) { console.error("Product masters could not be loaded", error); unavailable = true; }
  const values = definitions.flatMap((item) => item.values);
  const selectedDefinition = query.type === "definition" ? definitions.find((item) => item.id === query.edit) : undefined;
  const selectedValue = query.type === "value" ? values.find((item) => item.id === query.edit) : undefined;
  const selectedSize = query.type === "size" ? sizes.find((item) => item.id === query.edit) : undefined;
  const selectedApplication = query.type === "application" ? applications.find((item) => item.id === query.edit) : undefined;
  const selectedSpecification = query.type === "specification" ? specifications.find((item) => item.id === query.edit) : undefined;
  return <main className={styles.main}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Content studio / Product taxonomy</p><h1>Product masters</h1><p>Reusable attribute values, dimensions, and applications for consistent product data.</p></div></header>
    {unavailable ? <p className={styles.notice} role="alert">Product masters are unavailable. No changes have been made.</p> : null}
    {query.error ? <p className={styles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved ? <p className={styles.success} role="status">Master record saved.</p> : null}
    {!unavailable ? <div className={styles.layout}>
      <section className={`${styles.list} ${styles.editor}`} aria-labelledby="definitions-heading"><div className={styles.sectionHeading}><h2 id="definitions-heading">Attribute definitions</h2><Link href="/admin/product-masters?type=definition">Add</Link></div>
        <ul>{definitions.map((item) => <li key={item.id}><Link href={`/admin/product-masters?type=definition&edit=${encodeURIComponent(item.id)}`}><span className={styles.order}>{item.sortOrder}</span><span className={styles.recordName}><strong>{item.name}</strong><small>{item.kind.toLowerCase()} / {item.values.length} values</small></span><span aria-hidden="true">↗</span></Link></li>)}</ul>
        {query.type === "definition" ? <form action={saveProductMaster}><input name="intent" type="hidden" value="definition" />{selectedDefinition ? <input name="id" type="hidden" value={selectedDefinition.id} /> : null}
          <label>Name<input name="name" required maxLength={100} defaultValue={selectedDefinition?.name ?? ""} /></label><label>Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selectedDefinition)} defaultValue={selectedDefinition?.slug ?? ""} /></label>
          <label>Kind<select name="kind" defaultValue={selectedDefinition?.kind ?? "SURFACE"} disabled={Boolean(selectedDefinition)}>{kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>{selectedDefinition ? <input name="kind" type="hidden" value={selectedDefinition.kind} /> : null}
          <label>Order<input name="sortOrder" type="number" min={0} max={100000} required defaultValue={selectedDefinition?.sortOrder ?? definitions.length} /></label><label className={styles.checkbox}><input name="filterable" type="checkbox" defaultChecked={selectedDefinition?.filterable ?? true} /> Filterable</label><AdminFormSubmit className={styles.action} label="Save definition" />
        </form> : null}
      </section>
      <section className={`${styles.list} ${styles.editor}`} aria-labelledby="values-heading"><div className={styles.sectionHeading}><h2 id="values-heading">Attribute values</h2><Link href="/admin/product-masters?type=value">Add</Link></div>
        <ul>{definitions.flatMap((definition) => definition.values.map((item) => <li key={item.id}><Link href={`/admin/product-masters?type=value&edit=${encodeURIComponent(item.id)}`}><span className={styles.order}>{item.sortOrder}</span><span className={styles.recordName}><strong>{item.label}</strong><small>{definition.name} / {item.slug}</small></span><span aria-hidden="true">↗</span></Link></li>))}</ul>
        {query.type === "value" ? <form action={saveProductMaster}><input name="intent" type="hidden" value="value" />{selectedValue ? <input name="id" type="hidden" value={selectedValue.id} /> : null}
          <label>Definition<select name="definitionId" defaultValue={selectedValue?.definitionId ?? ""} required disabled={Boolean(selectedValue)}><option value="">Select definition</option>{definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{selectedValue ? <input name="definitionId" type="hidden" value={selectedValue.definitionId} /> : null}
          <label>Label<input name="label" required maxLength={100} defaultValue={selectedValue?.label ?? ""} /></label><label>Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selectedValue)} defaultValue={selectedValue?.slug ?? ""} /></label><label>Order<input name="sortOrder" type="number" min={0} max={100000} required defaultValue={selectedValue?.sortOrder ?? values.length} /></label><AdminFormSubmit className={styles.action} label="Save value" />
        </form> : null}
      </section>
      <section className={`${styles.list} ${styles.editor}`} aria-labelledby="sizes-heading"><div className={styles.sectionHeading}><h2 id="sizes-heading">Sizes</h2><Link href="/admin/product-masters?type=size">Add</Link></div>
        <ul>{sizes.map((item) => <li key={item.id}><Link href={`/admin/product-masters?type=size&edit=${encodeURIComponent(item.id)}`}><span className={styles.order}>↗</span><span className={styles.recordName}><strong>{item.label}</strong><small>{Number(item.widthMm)} × {Number(item.lengthMm)} mm</small></span></Link></li>)}</ul>
        {query.type === "size" ? <form action={saveProductMaster}><input name="intent" type="hidden" value="size" />{selectedSize ? <input name="id" type="hidden" value={selectedSize.id} /> : null}
          <label>Label<input name="label" required maxLength={100} defaultValue={selectedSize?.label ?? ""} /></label><div className={styles.fields}><label>Width (mm)<input name="widthMm" type="number" step="0.01" min="0.01" required defaultValue={selectedSize ? Number(selectedSize.widthMm) : ""} /></label><label>Length (mm)<input name="lengthMm" type="number" step="0.01" min="0.01" required defaultValue={selectedSize ? Number(selectedSize.lengthMm) : ""} /></label></div><AdminFormSubmit className={styles.action} label="Save size" />
        </form> : null}
      </section>
      <section className={`${styles.list} ${styles.editor}`} aria-labelledby="applications-heading"><div className={styles.sectionHeading}><h2 id="applications-heading">Applications</h2><Link href="/admin/product-masters?type=application">Add</Link></div>
        <ul>{applications.map((item) => <li key={item.id}><Link href={`/admin/product-masters?type=application&edit=${encodeURIComponent(item.id)}`}><span className={styles.order}>{item.sortOrder}</span><span className={styles.recordName}><strong>{item.name}</strong><small>{item.state.toLowerCase()} / {item.slug}</small></span><span aria-hidden="true">↗</span></Link></li>)}</ul>
        {query.type === "application" ? <form action={saveProductMaster}><input name="intent" type="hidden" value="application" />{selectedApplication ? <input name="id" type="hidden" value={selectedApplication.id} /> : null}
          <label>Name<input name="name" required maxLength={100} defaultValue={selectedApplication?.name ?? ""} /></label><label>Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selectedApplication)} defaultValue={selectedApplication?.slug ?? ""} /></label><div className={styles.fields}><label>Status<select name="state" defaultValue={selectedApplication?.state ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><label>Order<input name="sortOrder" type="number" min={0} max={100000} required defaultValue={selectedApplication?.sortOrder ?? applications.length} /></label></div><AdminFormSubmit className={styles.action} label="Save application" />
        </form> : null}
      </section>
      <section className={`${styles.list} ${styles.editor}`} aria-labelledby="specifications-heading"><div className={styles.sectionHeading}><h2 id="specifications-heading">Specification definitions</h2><Link href="/admin/product-masters?type=specification">Add</Link></div>
        <ul>{specifications.map((item) => <li key={item.id}><Link href={`/admin/product-masters?type=specification&edit=${encodeURIComponent(item.id)}`}><span className={styles.recordName}><strong>{item.label}</strong><small>{item.key}{item.unit ? ` / ${item.unit}` : ""}</small></span></Link></li>)}</ul>
        {query.type === "specification" ? <form action={saveProductMaster}><input name="intent" type="hidden" value="specification" />{selectedSpecification ? <input name="id" type="hidden" value={selectedSpecification.id} /> : null}
          <label>Label<input name="label" required maxLength={100} defaultValue={selectedSpecification?.label ?? ""} /></label><label>Key<input name="key" required pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selectedSpecification)} defaultValue={selectedSpecification?.key ?? ""} /></label>
          <div className={styles.fields}><label>Unit<input name="unit" maxLength={40} defaultValue={selectedSpecification?.unit ?? ""} /></label><label>Test method<input name="testMethod" maxLength={200} defaultValue={selectedSpecification?.testMethod ?? ""} /></label></div><AdminFormSubmit className={styles.action} label="Save specification" />
        </form> : null}
      </section>
    </div> : null}
    <p className={styles.empty}>Definitions, values, sizes and specifications have no archive flag in the current schema. They remain editable and are never hard-deleted here.</p>
  </main>;
}
