import ClientProductPage from "./components/client-product-page";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;
  return (
    <div>
      <ClientProductPage id={id} />
    </div>
  );
};

export default ProductPage;
