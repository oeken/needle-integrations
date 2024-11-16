import { Footer } from "~/app/_components/atoms/Footer";

export default async function UnauthorizedPage() {
  return (
    <>
      <main className="flex grow flex-col">
        <div className="mx-auto my-auto flex w-full flex-col text-center md:w-[700px]">
          <h1 className="text-2xl font-bold">⚠️ Unauthorized</h1>

          <p className="mt-2 text-gray-400">
            No user session found. Please login at Needle to continue.
          </p>

          <a
            className="mx-auto mt-8 rounded-md bg-orange-600 px-3 py-1 text-sm font-semibold"
            href={`${process.env.NEEDLE_URL}/login`}
          >
            ↗ To Needle Login
          </a>
        </div>
      </main>

      <Footer />
    </>
  );
}
