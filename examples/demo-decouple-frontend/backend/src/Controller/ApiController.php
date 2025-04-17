<?php

namespace App\Controller;

use App\Repository\PostRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class ApiController extends AbstractController
{
    #[Route('/get-all-posts', methods: ['GET'])]
    public function getAllPosts(PostRepository $postRepository): JsonResponse
    {
        return $this->json($postRepository->getAllPosts());
    }

    #[Route('/get-post/{id}', methods: ['GET'])]
    public function getPost(int $id, PostRepository $postRepository): JsonResponse
    {
        return $this->json($postRepository->getPost($id));
    }
}