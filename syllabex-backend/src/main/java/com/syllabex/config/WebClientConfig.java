package com.syllabex.config;

import io.netty.channel.ChannelOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.http.codec.json.Jackson2JsonDecoder;
import org.springframework.http.codec.json.Jackson2JsonEncoder;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
@Slf4j
public class WebClientConfig {

    @Value("${app.fastapi.base-url}")
    private String fastapiBaseUrl;

    @Value("${app.fastapi.timeout-seconds}")
    private int timeoutSeconds;

    @Bean("fastapiWebClient")
    public WebClient fastapiWebClient() {


        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, timeoutSeconds * 1000)
                .responseTimeout(Duration.ofSeconds(timeoutSeconds))
                .doOnConnected(conn ->
                        conn.addHandlerLast(new io.netty.handler.timeout.ReadTimeoutHandler(timeoutSeconds))
                                .addHandlerLast(new io.netty.handler.timeout.WriteTimeoutHandler(timeoutSeconds))
                );

        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> {
                    configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024); // 10MB
                    configurer.defaultCodecs().jackson2JsonDecoder(new Jackson2JsonDecoder());
                    configurer.defaultCodecs().jackson2JsonEncoder(new Jackson2JsonEncoder());
                })
                .build();

        log.info("Initializing FastAPI WebClient → {} (timeout={}s)", fastapiBaseUrl, timeoutSeconds);

        return WebClient.builder()
                .baseUrl(fastapiBaseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient)) // ✅ attach timeout-enabled client
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .exchangeStrategies(strategies)
                .build();
    }
}