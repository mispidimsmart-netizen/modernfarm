Deno.test("env diag", () => {
  const keys = Object.keys(Deno.env.toObject()).filter(k =>
    /SUPA|VAPID|LOVABLE|SERVICE|ANON|PUBLISH/i.test(k)
  );
  console.log("AVAILABLE_KEYS:", keys);
});
