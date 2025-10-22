/*
 * Copyright (c) 2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
package io.developer.sandbox.crw.multicluster.redirector.filter;

import java.io.IOException;
import java.util.regex.Pattern;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebFilter(urlPatterns = "/*")
public class RootFilter extends HttpFilter {

    private static final long serialVersionUID = 1L;
    private static final Pattern FILE_NAME_PATTERN = Pattern.compile(".*[.][a-zA-Z\\d]+");

    @Override
    public void doFilter(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        chain.doFilter(request, response);

        if (response.getStatus() == 404) {
            String path = request.getRequestURI().substring(
                    request.getContextPath().length()).replaceAll("[/]+$", "");
            if (!FILE_NAME_PATTERN.matcher(path).matches()) {
                // We could not find the resource, i.e. it is not anything known to the server (i.e. it is not a REST
                // endpoint or a servlet), and does not look like a file so redirecting to the root
                try {
                    response.sendRedirect("/");
                } finally {
                    response.getOutputStream().close();
                }
            }
        }
    }

}
