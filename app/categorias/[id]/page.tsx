import CategoryProductPageClient from "./components/category-product-page-cliente";

interface CategoryProductPageProps {
  params: Promise<{ id: string }>;
}

const CategoryProductPage = async ({ params }: CategoryProductPageProps) => {
  const { id } = await params;

  return <CategoryProductPageClient id={id} />;
};

export default CategoryProductPage;
