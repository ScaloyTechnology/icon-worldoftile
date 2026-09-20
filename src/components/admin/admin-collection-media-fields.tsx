"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminMediaPicker, type AdminSelectableMedia } from "./admin-media-picker";
import styles from "./admin-collection-media-fields.module.css";

type Props = Readonly<{ assets: readonly AdminSelectableMedia[]; coverId?: string | null; heroId?: string | null; error?: string }>;

export function AdminCollectionMediaFields({ assets, coverId, heroId, error }: Props) {
  const [cover, setCover] = useState(coverId ?? "");
  const [hero, setHero] = useState(heroId ?? "");
  const [heroMode, setHeroMode] = useState<"cover" | "different">(heroId ? "different" : "cover");
  return <div className={styles.root}>
    <AdminMediaPicker name="coverMediaId" label="Cover image" assets={assets} value={cover} onChange={setCover} help="Used for Collection previews and as the homepage image unless you choose a different one." />
    <div className={styles.hero}>
      <div className={styles.heading}><strong>Homepage image</strong><small>The Material Desk needs one approved image when this Collection is published and shown on the homepage.</small></div>
      <div className={styles.options} role="radiogroup" aria-label="Homepage image source">
        <label><input type="radio" name="homepageImageSource" value="cover" checked={heroMode === "cover"} onChange={() => setHeroMode("cover")} /> Use cover image</label>
        <label><input type="radio" name="homepageImageSource" value="different" checked={heroMode === "different"} onChange={() => setHeroMode("different")} /> Choose different image</label>
      </div>
      {heroMode === "different" ? <AdminMediaPicker name="heroMediaId" label="Different homepage image" assets={assets} value={hero} onChange={setHero} /> : <input type="hidden" name="heroMediaId" value="" />}
    </div>
    {!assets.length ? <p className={styles.notice}>No approved image assets are available. <Link href="/admin/media?action=new">Register and approve a deployed image in Media</Link>, then return here to select it.</p> : null}
    {error ? <p className={styles.fieldError} role="alert">{error}</p> : null}
  </div>;
}
