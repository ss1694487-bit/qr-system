import { useEffect, useState } from "react";
import { Sparkles, Copy, ExternalLink, LoaderCircle, MapPin, CheckCircle2 } from "lucide-react";

const API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

export default function App() {
  const match = window.location.pathname.match(/^\/r\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  const slug = match?.[1];
  const [business, setBusiness] = useState(null);
  const [pageError, setPageError] = useState("");
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  useEffect(() => {
    if (!slug) {
      setPageError("This QR link is not valid.");
      setLoadingBusiness(false);
      return;
    }
    fetch(`${API}/api/business/${slug}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Business page not found.");
        return data;
      })
      .then(setBusiness)
      .catch(e => setPageError(e.message))
      .finally(() => setLoadingBusiness(false));
  }, [slug]);

  if (loadingBusiness) return <main className="shell"><div className="panel center"><LoaderCircle className="spin"/> Loading business...</div></main>;
  if (pageError || !business) return <main className="shell"><div className="panel center"><h1>Review Assistant</h1><p>{pageError || "Business not found."}</p></div></main>;

  return <ReviewPage business={business} slug={slug} />;
}

function ReviewPage({ business, slug }) {
  const [service, setService] = useState("");
  const [experience, setExperience] = useState("");
  const [feedback, setFeedback] = useState("");
  const [language, setLanguage] = useState(business.languages?.[0] || "English");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(e) {
    e.preventDefault();
    setBusy(true); setError(""); setDraft(""); setCopied(false);
    try {
      const response = await fetch(`${API}/api/generate-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, service, experience, feedback, language })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate draft.");
      setDraft(data.review);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
  }

  return (
    <main className="shell" style={{"--brand": business.brandColor || "#0864EB"}}>
      <header className="top">
        <div className="brandmark"><Sparkles size={19}/><span>AI REVIEW ASSISTANT</span></div>
        <span className="powered">Powered by AI</span>
      </header>

      <section className="panel">
        <div className="eyebrow">CUSTOMER FEEDBACK</div>
        <h1>{business.businessName}</h1>
        {business.city && <p className="location"><MapPin size={15}/>{business.city}</p>}
        <p className="intro">Tell us about your actual experience. Your honest feedback helps this business understand what it does well and what it can improve.</p>

        <form onSubmit={generate}>
          <label htmlFor="service">What service or product did you use?</label>
          <input id="service" required maxLength="120" value={service} onChange={e=>setService(e.target.value)} placeholder="e.g. Wedding photography, printing, stationery"/>

          <label htmlFor="experience">How would you describe your experience?</label>
          <select id="experience" required value={experience} onChange={e=>setExperience(e.target.value)}>
            <option value="">Choose an honest description</option>
            <option>Very good</option>
            <option>Good</option>
            <option>Average</option>
            <option>Could be better</option>
          </select>

          <label htmlFor="feedback">Describe what actually happened</label>
          <textarea id="feedback" required minLength="10" maxLength="1200" rows="5" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What did you purchase or experience? What went well or could be improved? Please use your own words."/>
          <div className="counter">{feedback.length}/1200</div>

          <label htmlFor="language">Draft language</label>
          <select id="language" value={language} onChange={e=>setLanguage(e.target.value)}>
            {(business.languages || ["English","Hindi","Hinglish"]).map(l=><option key={l}>{l}</option>)}
          </select>

          <button className="primary" disabled={busy}>
            {busy ? <><LoaderCircle className="spin" size={18}/> Creating draft...</> : <><Sparkles size={18}/> Help me write my review</>}
          </button>
        </form>

        {error && <div className="alert" role="alert">{error}</div>}

        {draft && <section className="draft">
          <div className="draft-title"><CheckCircle2 size={19}/><h2>Your review draft</h2></div>
          <p className="notice">AI has only used the details you supplied. Read carefully and edit anything that does not exactly match your experience. You do not have to post a review.</p>
          <textarea aria-label="Editable review draft" rows="7" value={draft} onChange={e=>setDraft(e.target.value)}/>
          <button className="secondary" onClick={copyDraft}><Copy size={17}/>{copied ? "Copied" : "Copy draft"}</button>
          <a className="primary linkbutton" href={business.reviewUrl} target="_blank" rel="noopener noreferrer" onClick={()=>{}}>
            Continue to Google Reviews <ExternalLink size={16}/>
          </a>
        </section>}
      </section>

      <footer>
        <p>Honest feedback is welcome, whether positive, neutral or negative.</p>
        <span>Review drafts are optional. You choose whether to edit, copy or publish.</span>
      </footer>
    </main>
  );
}
