import { useRef, useState } from "react";

import {
  Camera,
  Image as ImageIcon,
  X,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ReceiptText,
} from "lucide-react";

import {
  collection,
  doc,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";

import { createWorker } from "tesseract.js";

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/* =========================
   AMOUNT DETECTION
========================= */

const extractAmount = (text) => {
  if (!text) return "";

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const priorityWords = [
    "grand total",
    "total",
    "amount due",
    "net total",
    "balance",
    "payable",
    "subtotal",
  ];

  for (const word of priorityWords) {
    const matchingLine = lines.find((line) =>
      line.toLowerCase().includes(word)
    );

    if (matchingLine) {
      const matches =
        matchingLine.match(
          /(?:rs\.?|lkr|usd|\$|€|£)?\s*(\d[\d,]*(?:\.\d{1,2})?)/gi
        );

      if (matches?.length) {
        const last = matches[matches.length - 1];

        const numberMatch =
          last.match(
            /\d[\d,]*(?:\.\d{1,2})?/
          );

        if (numberMatch) {
          const amount =
            numberMatch[0]
              .replace(/,/g, "")
              .trim();

          const parsed =
            Number(amount);

          if (
            Number.isFinite(parsed) &&
            parsed > 0
          ) {
            return parsed.toFixed(2);
          }
        }
      }
    }
  }

  /* Fallback */

  const allMatches = text.match(
    /\b\d[\d,]*(?:\.\d{1,2})?\b/g
  );

  if (!allMatches?.length) {
    return "";
  }

  const numbers = allMatches
    .map((value) =>
      Number(value.replace(/,/g, ""))
    )
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value > 0
    );

  if (!numbers.length) {
    return "";
  }

  /*
    Usually the largest number on a receipt
    is the total amount.
  */

  return Math.max(...numbers).toFixed(2);
};

/* =========================
   DATE DETECTION
========================= */

const extractDate = (text) => {
  if (!text) return getToday();

  const patterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) continue;

    let year;
    let month;
    let day;

    if (match[1].length === 4) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);

      if (year < 100) {
        year += 2000;
      }
    }

    if (
      year >= 2000 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return `${year}-${String(
        month
      ).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }
  }

  return getToday();
};

/* =========================
   CATEGORY DETECTION
========================= */

const extractCategory = (text) => {
  const value =
    text.toLowerCase();

  if (
    /restaurant|cafe|kfc|pizza|burger|food|meal|bakery|hotel/.test(
      value
    )
  ) {
    return "Food";
  }

  if (
    /fuel|petrol|diesel|ceypetco|shell|service station/.test(
      value
    )
  ) {
    return "Transport";
  }

  if (
    /uber|pickme|taxi|bus|train/.test(
      value
    )
  ) {
    return "Transport";
  }

  if (
    /supermarket|keells|cargills|arpico|market|grocery/.test(
      value
    )
  ) {
    return "Groceries";
  }

  if (
    /pharmacy|hospital|medical|clinic/.test(
      value
    )
  ) {
    return "Health";
  }

  if (
    /dialog|mobitel|hutch|airtel|internet|telecom/.test(
      value
    )
  ) {
    return "Bills";
  }

  if (
    /shirt|trouser|clothing|fashion|shoe/.test(
      value
    )
  ) {
    return "Shopping";
  }

  return "Other";
};

export default function ReceiptScanner({
  user,
  onClose,
  onSaved,
}) {
  const cameraInputRef =
    useRef(null);

  const galleryInputRef =
    useRef(null);

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [status, setStatus] =
    useState("");

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);

  /* =========================
     IMAGE PROCESSING
  ========================= */

  const processReceipt = async (
    file
  ) => {
    if (!file || !user) return;

    setProcessing(true);
    setError("");
    setResult(null);
    setProgress(0);
    setStatus(
      "Preparing receipt..."
    );

    try {
      const worker =
        await createWorker("eng", 1, {
          logger: (message) => {
            if (
              message.status ===
              "recognizing text"
            ) {
              const value = Math.round(
                (message.progress || 0) *
                  100
              );

              setProgress(value);

              setStatus(
                `Reading receipt... ${value}%`
              );
            }
          },
        });

      const {
        data: { text },
      } = await worker.recognize(file);

      await worker.terminate();

      if (!text?.trim()) {
        throw new Error(
          "Could not read any text from this receipt."
        );
      }

      const amount =
        extractAmount(text);

      const date =
        extractDate(text);

      const category =
        extractCategory(text);

      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const description =
        lines[0]?.slice(0, 80) ||
        "Receipt expense";

      if (!amount) {
        setResult({
          amount: "",
          date,
          category,
          description,
          rawText: text,
        });

        setStatus(
          "Receipt scanned. Amount could not be detected."
        );

        return;
      }

      setStatus(
        "Receipt scanned successfully."
      );

      setResult({
        amount,
        date,
        category,
        description,
        rawText: text,
      });
    } catch (scanError) {
      console.error(
        "Receipt OCR error:",
        scanError
      );

      setError(
        scanError?.message ||
          "Could not scan the receipt."
      );

      setStatus("");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================
     FILE SELECT
  ========================= */

  const handleFileChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      processReceipt(file);
    }

    event.target.value = "";
  };

  /* =========================
     SAVE TO FINANCE
  ========================= */

  const saveToFinance = async () => {
    if (
      !user ||
      !result ||
      !result.amount
    ) {
      return;
    }

    try {
      setProcessing(true);
      setStatus(
        "Adding receipt to Finance..."
      );
      setError("");

      const financeRef =
        collection(
          db,
          "users",
          user.uid,
          "finance"
        );

      const newRecordRef =
        doc(financeRef);

      const now = Date.now();

      const transaction = {
        id: newRecordRef.id,
        amount: Number(
          result.amount
        ),
        type: "expense",
        date:
          result.date || getToday(),
        category:
          result.category || "Other",
        description:
          result.description ||
          "Receipt expense",
        createdAt: now,
        source: "receipt",
      };

      await setDoc(
        newRecordRef,
        transaction
      );

      setStatus(
        "✓ Added to Finance"
      );

      setResult(null);

      setTimeout(() => {
        if (
          typeof onSaved ===
          "function"
        ) {
          onSaved(transaction);
        }

        if (
          typeof onClose ===
          "function"
        ) {
          onClose();
        }
      }, 600);
    } catch (saveError) {
      console.error(
        "Receipt save error:",
        saveError
      );

      setError(
        "Could not save the receipt to Finance."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-[10000]
        flex
        items-end
        justify-center
        bg-black/60
        p-3
        backdrop-blur-md
        sm:items-center
      "
    >
      <div
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-[30px]
          border
          border-white/10
          bg-[#111111]/95
          shadow-[0_25px_80px_rgba(0,0,0,0.55)]
          backdrop-blur-2xl
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-white/10
            px-5
            py-4
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-2xl
                bg-white
                text-black
              "
            >
              <ReceiptText
                size={20}
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white">
                Receipt Scan
              </h2>

              <p className="text-[11px] text-white/40">
                Scan and add to Finance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              bg-white/5
              text-white/60
              transition
              hover:bg-white/10
              hover:text-white
              active:scale-90
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}

        <div className="p-5">
          {!processing &&
            !result && (
              <div className="space-y-3">
                {/* CAMERA */}

                <button
                  type="button"
                  onClick={() =>
                    cameraInputRef.current?.click()
                  }
                  className="
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.06]
                    p-4
                    text-left
                    transition-all
                    duration-200
                    active:scale-[0.98]
                  "
                >
                  <span
                    className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      bg-white
                      text-black
                    "
                  >
                    <Camera size={22} />
                  </span>

                  <span>
                    <span className="block text-sm font-semibold text-white">
                      Take Photo
                    </span>

                    <span className="block mt-1 text-[11px] text-white/40">
                      Use your camera
                    </span>
                  </span>
                </button>

                {/* GALLERY */}

                <button
                  type="button"
                  onClick={() =>
                    galleryInputRef.current?.click()
                  }
                  className="
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.06]
                    p-4
                    text-left
                    transition-all
                    duration-200
                    active:scale-[0.98]
                  "
                >
                  <span
                    className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      bg-white/10
                      text-white
                    "
                  >
                    <ImageIcon size={22} />
                  </span>

                  <span>
                    <span className="block text-sm font-semibold text-white">
                      Choose from Gallery
                    </span>

                    <span className="block mt-1 text-[11px] text-white/40">
                      Select a receipt photo
                    </span>
                  </span>
                </button>

                {error && (
                  <div
                    className="
                      flex
                      items-start
                      gap-2
                      rounded-2xl
                      border
                      border-red-400/20
                      bg-red-400/10
                      p-3
                      text-xs
                      text-red-300
                    "
                  >
                    <AlertCircle
                      size={16}
                      className="mt-0.5 shrink-0"
                    />

                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}

          {/* PROCESSING */}

          {processing && (
            <div className="py-8 text-center">
              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.06]
                "
              >
                <LoaderCircle
                  size={30}
                  className="animate-spin text-white"
                />
              </div>

              <p className="mt-5 text-sm font-medium text-white">
                {status ||
                  "Processing receipt..."}
              </p>

              <div
                className="
                  mx-auto
                  mt-4
                  h-1.5
                  w-full
                  overflow-hidden
                  rounded-full
                  bg-white/10
                "
              >
                <div
                  className="
                    h-full
                    rounded-full
                    bg-white
                    transition-all
                    duration-300
                  "
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* RESULT */}

          {!processing &&
            result && (
              <div className="space-y-4">
                <div
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-emerald-400/20
                    bg-emerald-400/10
                    p-3
                  "
                >
                  <CheckCircle2
                    size={20}
                    className="text-emerald-400"
                  />

                  <div>
                    <p className="text-xs font-semibold text-emerald-300">
                      Receipt scanned
                    </p>

                    <p className="text-[10px] text-emerald-300/60">
                      Review the detected details
                    </p>
                  </div>
                </div>

                {/* AMOUNT */}

                <div>
                  <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-white/40">
                    Amount
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={result.amount}
                    onChange={(event) =>
                      setResult({
                        ...result,
                        amount:
                          event.target.value,
                      })
                    }
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.06]
                      px-4
                      py-3
                      text-lg
                      font-semibold
                      text-white
                      outline-none
                      focus:border-white/30
                    "
                  />
                </div>

                {/* CATEGORY */}

                <div>
                  <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-white/40">
                    Category
                  </label>

                  <select
                    value={result.category}
                    onChange={(event) =>
                      setResult({
                        ...result,
                        category:
                          event.target.value,
                      })
                    }
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-white/10
                      bg-[#191919]
                      px-4
                      py-3
                      text-sm
                      text-white
                      outline-none
                    "
                  >
                    <option value="Food">
                      Food
                    </option>
                    <option value="Groceries">
                      Groceries
                    </option>
                    <option value="Transport">
                      Transport
                    </option>
                    <option value="Shopping">
                      Shopping
                    </option>
                    <option value="Bills">
                      Bills
                    </option>
                    <option value="Health">
                      Health
                    </option>
                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                {/* DATE */}

                <div>
                  <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-white/40">
                    Date
                  </label>

                  <input
                    type="date"
                    value={result.date}
                    onChange={(event) =>
                      setResult({
                        ...result,
                        date:
                          event.target.value,
                      })
                    }
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.06]
                      px-4
                      py-3
                      text-sm
                      text-white
                      outline-none
                    "
                  />
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-white/40">
                    Description
                  </label>

                  <input
                    type="text"
                    value={
                      result.description
                    }
                    onChange={(event) =>
                      setResult({
                        ...result,
                        description:
                          event.target.value,
                      })
                    }
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.06]
                      px-4
                      py-3
                      text-sm
                      text-white
                      outline-none
                    "
                  />
                </div>

                {error && (
                  <div
                    className="
                      flex
                      items-start
                      gap-2
                      rounded-2xl
                      border
                      border-red-400/20
                      bg-red-400/10
                      p-3
                      text-xs
                      text-red-300
                    "
                  >
                    <AlertCircle
                      size={16}
                      className="mt-0.5 shrink-0"
                    />

                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    !result.amount
                  }
                  onClick={
                    saveToFinance
                  }
                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-white
                    px-4
                    py-3.5
                    text-sm
                    font-semibold
                    text-black
                    shadow-lg
                    transition-all
                    duration-200
                    hover:bg-white/90
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  <CheckCircle2
                    size={18}
                  />

                  Add to Finance
                </button>
              </div>
            )}
        </div>

        {/* HIDDEN INPUTS */}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}