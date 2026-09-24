"use client";

import { type KeyboardEvent, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Arrow } from "@/components/arrow";
import {
  type ContactEnquiryState,
  submitContactEnquiry,
} from "@/server/enquiries/submit-enquiry";

const initialContactEnquiryState = {
  status: "idle",
  message: "",
} satisfies ContactEnquiryState;

const baseEnquiryTypeOptions = [
  { value: "domestic", label: "Domestic enquiry" },
  { value: "export", label: "Export enquiry" },
  { value: "project", label: "Project consultation" },
  { value: "general", label: "General enquiry" },
] as const;

type EnquiryType = (typeof baseEnquiryTypeOptions)[number]["value"];
type EnquiryTypeOption = Readonly<{ value: EnquiryType; label: string }>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return <span className="contact-form__error" id={id}>{errors[0]}</span>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="contact-form__submit" type="submit" disabled={pending}>
      <span>{pending ? "Sending enquiry" : "Send enquiry"}</span>
      <span className="circle" aria-hidden="true"><Arrow diagonal /></span>
    </button>
  );
}

function EnquiryTypeSelect({
  value,
  onChange,
  invalid,
  describedBy,
  labelId,
  options,
}: {
  value: EnquiryType;
  onChange: (value: EnquiryType) => void;
  invalid: boolean;
  describedBy?: string;
  labelId: string;
  options: readonly EnquiryTypeOption[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex] ?? options[0] ?? baseEnquiryTypeOptions[0];

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function openAndFocus(index = selectedIndex) {
    setOpen(true);
    requestAnimationFrame(() => optionRefs.current[Math.max(index, 0)]?.focus());
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = (index + direction + options.length) % options.length;
      optionRefs.current[next]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : options.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className={`contact-select${open ? " is-open" : ""}`} ref={rootRef}>
      <input type="hidden" name="enquiryType" value={value} />
      <button
        ref={triggerRef}
        className="contact-select__trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="contact-enquiry-options"
        aria-invalid={invalid}
        aria-required="true"
        aria-labelledby={`${labelId} contact-enquiry-type-value`}
        aria-describedby={describedBy}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocus();
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span id="contact-enquiry-type-value">{selected.label}</span>
        <i aria-hidden="true" />
      </button>
      {open ? (
        <div className="contact-select__options" id="contact-enquiry-options" role="listbox" aria-label="Enquiry type">
          {options.map((option, index) => (
            <button
              ref={(node) => { optionRefs.current[index] = node; }}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{option.label}</strong>
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ContactEnquiryForm({ domesticLabel, exportLabel }: Readonly<{ domesticLabel: string; exportLabel: string }>) {
  const [state, formAction] = useActionState(submitContactEnquiry, initialContactEnquiryState);
  const formRef = useRef<HTMLFormElement>(null);
  const [enquiryType, setEnquiryType] = useState<EnquiryType>("domestic");
  const enquiryTypeOptions: readonly EnquiryTypeOption[] = [
    { value: "domestic", label: domesticLabel },
    { value: "export", label: exportLabel },
    ...baseEnquiryTypeOptions.slice(2),
  ];

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setEnquiryType("domestic");
    }
  }, [state.status, state.submissionId]);

  const error = (field: keyof NonNullable<typeof state.fieldErrors>) => state.fieldErrors?.[field];

  return (
    <form ref={formRef} action={formAction} className="contact-form" noValidate>
      {state.status === "success" ? <div className="contact-form__success" role="status" aria-live="polite">
        <span aria-hidden="true">✓</span>
        <div><strong>Enquiry received.</strong><p>{state.message}</p></div>
      </div> : null}

      <div className="contact-form__grid">
        <label className="contact-form__field">
          <span>Name *</span>
          <input name="name" type="text" autoComplete="name" required aria-invalid={Boolean(error("name"))} aria-describedby={error("name") ? "contact-name-error" : undefined} />
          <FieldError id="contact-name-error" errors={error("name")} />
        </label>

        <label className="contact-form__field">
          <span>Email address *</span>
          <input name="email" type="email" autoComplete="email" required aria-invalid={Boolean(error("email"))} aria-describedby={error("email") ? "contact-email-error" : undefined} />
          <FieldError id="contact-email-error" errors={error("email")} />
        </label>

        <label className="contact-form__field">
          <span>Phone number</span>
          <input name="phone" type="tel" autoComplete="tel" aria-invalid={Boolean(error("phone"))} aria-describedby={error("phone") ? "contact-phone-error" : undefined} />
          <FieldError id="contact-phone-error" errors={error("phone")} />
        </label>

        <div className="contact-form__field">
          <span id="contact-enquiry-type-label">Enquiry type *</span>
          <EnquiryTypeSelect
            value={enquiryType}
            onChange={setEnquiryType}
            invalid={Boolean(error("enquiryType"))}
            describedBy={error("enquiryType") ? "contact-type-error" : undefined}
            labelId="contact-enquiry-type-label"
            options={enquiryTypeOptions}
          />
          <FieldError id="contact-type-error" errors={error("enquiryType")} />
        </div>

        <label className="contact-form__field contact-form__field--message">
          <span>How can we help? *</span>
          <textarea name="message" rows={6} required aria-invalid={Boolean(error("message"))} aria-describedby={error("message") ? "contact-message-error" : undefined} />
          <FieldError id="contact-message-error" errors={error("message")} />
        </label>
      </div>

      <div className="contact-form__honeypot" aria-hidden="true">
        <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <label className="contact-form__consent">
        <input name="consent" type="checkbox" required aria-invalid={Boolean(error("consent"))} aria-describedby={error("consent") ? "contact-consent-error" : undefined} />
        <span>I agree that ICON may use these details to respond to my enquiry.</span>
      </label>
      <FieldError id="contact-consent-error" errors={error("consent")} />

      <footer className="contact-form__footer">
        <p className={`contact-form__status contact-form__status--${state.status}`} role="status" aria-live="polite">{state.status === "error" ? state.message : ""}</p>
        <SubmitButton />
      </footer>
    </form>
  );
}
